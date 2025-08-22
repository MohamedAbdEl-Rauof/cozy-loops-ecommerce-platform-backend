const Order = require('../models/Order');
const Cart = require('../models/Cart');
const stripe = require('../config/stripe');

/**
 * Create payment intent for an order
 * @route POST /api/payment/create-intent
 * @access Private
 */
exports.createPaymentIntent = async (req, res) => {
  try {
    const { orderId } = req.body;
    const userId = req.user._id;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: 'Order ID is required'
      });
    }

    const order = await Order.findById(orderId).populate('items.product');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    if (order.user.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access to order'
      });
    }

    if (order.paymentIntentId && order.paymentStatus === 'processing') {
      try {
        const existingPaymentIntent = await stripe.paymentIntents.retrieve(order.paymentIntentId);

        if (existingPaymentIntent && existingPaymentIntent.status !== 'canceled') {
          return res.status(200).json({
            success: true,
            data: {
              clientSecret: existingPaymentIntent.client_secret,
              paymentIntentId: existingPaymentIntent.id,
              orderId: order._id,
              orderNumber: order.orderNumber,
              amount: order.totalAmount,
              breakdown: {
                subtotal: order.subtotal,
                shipping: order.shippingCost,
                tax: order.tax,
                total: order.totalAmount
              }
            },
            message: 'Existing payment intent retrieved successfully'
          });
        }
      } catch (stripeError) {
        console.error('Existing payment intent not found or invalid, creating new one:', stripeError.message);
      }
    }

    if (!['pending', 'processing'].includes(order.paymentStatus)) {
      return res.status(400).json({
        success: false,
        message: `Cannot create payment for order with payment status: ${order.paymentStatus}`
      });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(order.totalAmount * 100),
      currency: 'usd',
      metadata: {
        orderId: order._id.toString(),
        orderNumber: order.orderNumber,
        userId: userId.toString()
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    order.setPaymentIntent(paymentIntent.id);
    if (order.paymentStatus === 'pending') {
      order.paymentStatus = 'processing';
    }
    await order.save();

    res.status(200).json({
      success: true,
      data: {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        orderId: order._id,
        orderNumber: order.orderNumber,
        amount: order.totalAmount,
        breakdown: {
          subtotal: order.subtotal,
          shipping: order.shippingCost,
          tax: order.tax,
          total: order.totalAmount
        }
      },
      message: 'Payment intent created successfully'
    });

  } catch (error) {
    console.error('Create payment intent error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating payment intent',
      error: error.message
    });
  }
};

/**
 * Verify payment and complete order
 * @route POST /api/payment/verify
 * @access Private
 */
exports.verifyPayment = async (req, res) => {
  try {
    const { paymentIntentId } = req.body;
    const userId = req.user._id;

    if (!paymentIntentId) {
      return res.status(400).json({
        success: false,
        message: 'Payment Intent ID is required'
      });
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (!paymentIntent) {
      return res.status(404).json({
        success: false,
        message: 'Payment intent not found'
      });
    }

    const order = await Order.findOne({ paymentIntentId: paymentIntentId });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found for this payment'
      });
    }

    if (order.user.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access to order'
      });
    }

    if (paymentIntent.status === 'succeeded') {
      order.markPaymentCompleted();
      await order.save();

      const cart = await Cart.findOne({ orderId: order._id });
      if (cart) {
        cart.markAsCompleted();
        await cart.save();
      }

      res.status(200).json({
        success: true,
        message: 'Payment verified and order completed',
        order: {
          _id: order._id,
          orderNumber: order.orderNumber,
          paymentStatus: order.paymentStatus,
          orderStatus: order.orderStatus,
          totalAmount: order.totalAmount
        },
        redirectUrl: `/order-confirmation?orderId=${order.orderNumber}`
      });

    } else if (paymentIntent.status === 'requires_payment_method') {
      res.status(400).json({
        success: false,
        message: 'Payment failed - requires new payment method',
        paymentStatus: paymentIntent.status,
        redirectUrl: '/payment/failed'
      });

    } else if (paymentIntent.status === 'canceled') {
      order.markPaymentFailed();
      await order.save();
      res.status(400).json({
        success: false,
        message: 'Payment was canceled',
        paymentStatus: paymentIntent.status,
        redirectUrl: '/payment/error'
      });

    } else if (paymentIntent.status === 'requires_action') {
      res.status(400).json({
        success: false,
        message: 'Payment requires additional action',
        paymentStatus: paymentIntent.status,
        redirectUrl: '/payment/failed'
      });

    } else {
      res.status(400).json({
        success: false,
        message: `Payment is in ${paymentIntent.status} status`,
        paymentStatus: paymentIntent.status,
        redirectUrl: '/payment/error'
      });
    }

  } catch (error) {
    console.error('Verify payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while verifying payment',
      error: error.message,
      redirectUrl: '/payment/error'
    });
  }
};