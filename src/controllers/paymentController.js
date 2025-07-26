const stripe = require('../config/stripe');
const Cart = require('../models/Cart');
const Order = require('../models/Order');
const User = require('../models/User');

const generateOrderNumber = () => {
  return 'ORD-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9).toUpperCase();
};

const createPaymentIntent = async (req, res) => {
  try {
    const allowedFields = ['userId', 'cartId', 'shippingAddress', 'amount'];
    const requestBody = {};
    
    allowedFields.forEach(field => {
      if (req.body && req.body.hasOwnProperty(field)) {
        requestBody[field] = req.body[field];
      }
    });

    const unknownFields = Object.keys(req.body || {}).filter(field => !allowedFields.includes(field));
    if (unknownFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Unknown fields not allowed: ${unknownFields.join(', ')}`,
        allowedFields: allowedFields
      });
    }

    const { userId, cartId, shippingAddress, amount } = requestBody;
    
    const finalUserId = userId || (req.user ? req.user.id : null);

    if (!finalUserId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required (either in body or via authentication)'
      });
    }

    const user = await User.findById(finalUserId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    let totalAmount;
    let orderItems = [];
    let subtotal = 0;
    let shippingCost = 10.00;
    let tax = 0;

    if (amount && typeof amount === 'number' && amount > 0) {
      totalAmount = amount;
      subtotal = amount - shippingCost;
      tax = subtotal * 0.08; 
      
      orderItems = [{
        product: null,
        quantity: 1,
        price: subtotal,
        description: 'Custom payment'
      }];
            
    } else {
      let cart;
      if (cartId) {
        cart = await Cart.findById(cartId).populate('items.product');
      } else {
        cart = await Cart.findOne({ user: finalUserId }).populate('items.product');
      }

      if (!cart || cart.items.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Cart is empty or not found, and no amount specified'
        });
      }

      if (cart.user.toString() !== finalUserId) {
        console.log('Cart user mismatch, but proceeding with payment');
      }

      subtotal = cart.items.reduce((total, item) => {
        return total + (item.product.price * item.quantity);
      }, 0);

      const taxRate = 0.08; 
      tax = subtotal * taxRate;
      totalAmount = subtotal + shippingCost + tax;

      orderItems = cart.items.map(item => ({
        product: item.product._id,
        quantity: item.quantity,
        price: item.product.price
      }));
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(totalAmount * 100), 
      currency: 'usd',
      payment_method_types: ['card'],
      metadata: {
        userId: finalUserId,
        cartId: cartId || 'direct-payment',
        orderType: 'ecommerce',
        subtotal: subtotal.toString(),
        shipping: shippingCost.toString(),
        tax: tax.toString(),
        originalRequest: JSON.stringify(requestBody).substring(0, 500) 
      }
    });

    const order = new Order({
      orderNumber: generateOrderNumber(),
      user: finalUserId,
      items: orderItems,
      subtotal: subtotal,
      shippingCost: shippingCost,
      tax: tax,
      totalAmount: totalAmount,
      shippingAddress: shippingAddress || {
        street: "Default Street",
        city: "Default City",
        state: "Default State",
        zipCode: "00000",
        country: "US"
      },
      paymentIntentId: paymentIntent.id,
      paymentStatus: 'pending',
      orderStatus: 'pending'
    });

    await order.save();

    console.log('Real payment intent created:', {
      orderId: order._id,
      userId: finalUserId,
      cartId: cartId || 'direct-payment',
      paymentIntentId: paymentIntent.id,
      amount: totalAmount,
      originalRequest: requestBody
    });

    res.status(200).json({
      success: true,
      data: {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        orderId: order._id,
        orderNumber: order.orderNumber,
        amount: totalAmount,
        breakdown: {
          subtotal: subtotal,
          shipping: shippingCost,
          tax: tax,
          total: totalAmount
        },
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY
      },
      message: 'Payment intent created successfully. Use clientSecret for Stripe payment form.'
    });

  } catch (error) {
    console.error('Payment Intent Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create payment intent',
      error: error.message
    });
  }
};

const verifyPayment = async (req, res) => {
  try {
    const { orderNumber, paymentIntentId } = req.body;

    if (!orderNumber || !paymentIntentId) {
      return res.status(400).json({
        success: false,
        message: 'Order number and payment intent ID are required'
      });
    }

    // Verify payment intent with Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    // Find the order
    const order = await Order.findOne({ 
      orderNumber: orderNumber,
      paymentIntentId: paymentIntentId 
    }).populate('user', 'name email').populate('items.product');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if payment was successful
    if (paymentIntent.status === 'succeeded') {
      // Update order status if not already updated
      if (order.paymentStatus !== 'completed') {
        order.paymentStatus = 'completed';
        order.orderStatus = 'confirmed';
        order.paidAt = new Date();
        await order.save();

        // Clear cart if it exists
        if (paymentIntent.metadata.cartId && paymentIntent.metadata.cartId !== 'direct-payment') {
          await Cart.findOneAndUpdate(
            { user: order.user._id },
            { $set: { items: [] } }
          );
        }
      }

      res.status(200).json({
        success: true,
        message: 'Payment verified successfully',
        data: {
          orderNumber: order.orderNumber,
          paymentIntentId: paymentIntent.id,
          amount: order.totalAmount,
          status: paymentIntent.status,
          createdAt: order.createdAt,
          breakdown: {
            subtotal: order.subtotal,
            shipping: order.shippingCost,
            tax: order.tax,
            total: order.totalAmount
          },
          orderDetails: {
            orderId: order._id,
            orderStatus: order.orderStatus,
            paymentStatus: order.paymentStatus,
            items: order.items,
            shippingAddress: order.shippingAddress
          }
        }
      });

    } else {
      // Payment failed or pending
      res.status(400).json({
        success: false,
        message: `Payment verification failed. Status: ${paymentIntent.status}`,
        data: {
          orderNumber: order.orderNumber,
          paymentIntentId: paymentIntent.id,
          status: paymentIntent.status,
          orderStatus: order.orderStatus,
          paymentStatus: order.paymentStatus
        }
      });
    }

  } catch (error) {
    console.error('Verify Payment Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify payment',
      error: error.message
    });
  }
};

module.exports = {
  createPaymentIntent,
  verifyPayment
};