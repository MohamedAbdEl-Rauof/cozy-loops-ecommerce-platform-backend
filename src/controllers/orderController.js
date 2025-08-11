const Order = require('../models/Order');

/**
 * Get order by order number
 * @route GET /api/orders/number/:orderNumber
 * @access Private
 */
exports.getOrderByNumber = async (req, res) => {
  try {
    const { orderNumber } = req.params;
    const userId = req.user._id;

    if (!orderNumber) {
      return res.status(400).json({
        success: false,
        message: 'Order number is required'
      });
    }

    const order = await Order.findOne({ 
      orderNumber: orderNumber,
      user: userId 
    }).populate('items.product', 'name images price');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.status(200).json({
      success: true,
      order: order
    });

  } catch (error) {
    console.error('Get order by number error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching order',
      error: error.message
    });
  }
};

/**
 * Get all orders for current user
 * @route GET /api/orders
 * @access Private
 */
exports.getUserOrders = async (req, res) => {
  try {
    const userId = req.user._id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const orders = await Order.find({ user: userId })
      .populate('items.product', 'name images price')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalOrders = await Order.countDocuments({ user: userId });

    res.status(200).json({
      success: true,
      count: orders.length,
      totalOrders: totalOrders,
      totalPages: Math.ceil(totalOrders / limit),
      currentPage: page,
      orders: orders
    });

  } catch (error) {
    console.error('Get user orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching orders',
      error: error.message
    });
  }
};

/**
 * Get order by ID
 * @route GET /api/orders/:id
 * @access Private
 */
exports.getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const order = await Order.findOne({ 
      _id: id,
      user: userId 
    }).populate('items.product', 'name images price');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.status(200).json({
      success: true,
      order: order
    });

  } catch (error) {
    console.error('Get order by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching order',
      error: error.message
    });
  }
};

/**
 * Get order for payment (includes payment intent details)
 * @route GET /api/orders/:id/payment
 * @access Private
 */
exports.getOrderForPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const order = await Order.findOne({ 
      _id: id,
      user: userId 
    }).populate('items.product', 'name images price');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Return order with payment-specific information
    res.status(200).json({
      success: true,
      order: {
        _id: order._id,
        orderNumber: order.orderNumber,
        items: order.items,
        subtotal: order.subtotal,
        shippingCost: order.shippingCost,
        tax: order.tax,
        totalAmount: order.totalAmount,
        orderStatus: order.orderStatus,
        paymentStatus: order.paymentStatus,
        paymentIntentId: order.paymentIntentId,
        shippingAddress: order.shippingAddress,
        createdAt: order.createdAt,
        canPay: order.paymentStatus === 'pending' || order.paymentStatus === 'processing'
      }
    });

  } catch (error) {
    console.error('Get order for payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching order',
      error: error.message
    });
  }
};