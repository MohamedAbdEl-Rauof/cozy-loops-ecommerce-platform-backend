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

    // Find the order
    const order = await Order.findById(orderId).populate('items.product');
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Verify order belongs to user
    if (order.user.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access to order'
      });
    }

    // Check if order can be paid
    if (order.paymentStatus !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Cannot create payment for order with payment status: ${order.paymentStatus}`
      });
    }

    // Create payment intent with Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(order.totalAmount * 100), // Convert to cents
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

    // Update order with payment intent ID
    order.setPaymentIntent(paymentIntent.id);
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

    // Retrieve payment intent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (!paymentIntent) {
      return res.status(404).json({
        success: false,
        message: 'Payment intent not found'
      });
    }

    // Find order by payment intent ID
    const order = await Order.findOne({ paymentIntentId: paymentIntentId });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found for this payment'
      });
    }

    // Verify order belongs to user
    if (order.user.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access to order'
      });
    }

    // Check payment status
    if (paymentIntent.status === 'succeeded') {
      // Mark order as paid
      order.markPaymentCompleted();
      await order.save();

      // Find and mark associated cart as completed
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
      // Mark order as failed
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