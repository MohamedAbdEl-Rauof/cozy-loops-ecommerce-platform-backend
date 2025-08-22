const Cart = require('../models/Cart');
const Product = require('../models/Product');
const { getIO } = require('../sockets/cartSocket');

/**
 * Add item to cart
 * @route POST /api/cart/add
 * @access Private
 */
exports.addToCart = async (req, res) => {
  try {
    const { productId, quantity = 1, variant = null } = req.body;
    const userId = req.user._id;

    if (!productId) {
      return res.status(400).json({
        message: 'Product ID is required'
      });
    }

    if (quantity < 1) {
      return res.status(400).json({
        message: 'Quantity must be at least 1'
      });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        message: 'Product not found'
      });
    }

    if (!product.isActive) {
      return res.status(400).json({
        message: 'Product is not available'
      });
    }

    let cart = await Cart.findOne({
      user: userId,
      status: { $in: ['active', 'processing'] }
    }).populate('items.product');

    if (!cart || cart.status !== 'active') {
      cart = new Cart({
        user: userId,
        items: [],
        status: 'active'
      });
      await cart.save();
      await cart.populate('items.product');
    }

    try {
      await cart.addItem(productId, quantity, product.price, variant);
      await cart.save();
    } catch (error) {
      if (error.message.includes('Cannot modify cart with status')) {
        cart = new Cart({
          user: userId,
          items: [],
          status: 'active'
        });
        await cart.save();
        await cart.populate('items.product');
        await cart.addItem(productId, quantity, product.price, variant);
        await cart.save();
      } else {
        throw error;
      }
    }

    await cart.populate('items.product');

    try {
      const io = getIO();
      io.to(`user_${userId}`).emit('cartUpdated', {
        cart: cart,
        action: 'add',
        item: { productId, quantity, variant }
      });
    } catch (socketError) {
      console.error('Socket emission error:', socketError);
    }

    res.status(200).json({
      success: true,
      message: 'Item added to cart successfully',
      cart: {
        items: cart.items,
        totalItems: cart.totalItems,
        totalAmount: cart.totalAmount,
        lastUpdated: cart.lastUpdated
      }
    });

  } catch (error) {
    console.error('Add to cart error:', error);
    res.status(500).json({
      message: error.message || 'Server error while adding item to cart'
    });
  }
};

/**
 * Get user's cart
 * @route GET /api/cart
 * @access Private
 */
exports.getCart = async (req, res) => {
  try {
    const userId = req.user._id;
    let cart = await Cart.findOne({
      user: userId,
      status: { $in: ['active', 'processing'] }
    }).populate('items.product');

    if (!cart) {
      cart = new Cart({
        user: userId,
        items: [],
        status: 'active'
      });
      await cart.save();
      await cart.populate('items.product');
    }

    res.status(200).json({
      success: true,
      cart: {
        _id: cart._id,
        items: cart.items,
        totalItems: cart.totalItems,
        totalAmount: cart.totalAmount,
        status: cart.status,
        orderId: cart.orderId,
        lastUpdated: cart.lastUpdated,
        canModify: cart.status === 'active',
        isProcessing: cart.status === 'processing'
      }
    });

  } catch (error) {
    console.error('Get cart error:', error);
    res.status(500).json({
      message: 'Server error while retrieving cart'
    });
  }
};

/**
 * Update item quantity in cart
 * @route PUT /api/cart/update
 * @access Private
 */
exports.updateQuantity = async (req, res) => {
  try {
    const { productId, quantity, variant = null } = req.body;
    const userId = req.user._id;

    if (!productId) {
      return res.status(400).json({
        message: 'Product ID is required'
      });
    }

    if (quantity !== undefined && quantity < 0) {
      return res.status(400).json({
        message: 'Quantity cannot be negative'
      });
    }

    let cart = await Cart.findOne({
      user: userId,
      status: { $in: ['active', 'processing'] }
    });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'No cart found. Please add items to cart first.',
        suggestion: 'Create a new cart by adding items'
      });
    }

    if (cart.status === 'processing') {
      cart.status = 'active';
      cart.orderId = null;
      await cart.save();
    }

    const itemIndex = cart.items.findIndex(item => {
      const productMatch = item.product.toString() === productId.toString();
      const variantMatch = (item.variant === variant) ||
        (item.variant === null && variant === null) ||
        (item.variant === undefined && variant === null) ||
        (item.variant === null && variant === undefined);

      return productMatch && variantMatch;
    });

    if (itemIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Item not found in cart',
        debug: {
          searchingFor: { productId, variant },
          cartItems: cart.items.map(item => ({
            productId: item.product.toString(),
            variant: item.variant,
            quantity: item.quantity
          })),
          cartStatus: cart.status,
          cartId: cart._id.toString()
        }
      });
    }

    try {
      await cart.updateItemQuantity(productId, quantity, variant);
      await cart.save();
      await cart.populate('items.product');
    } catch (error) {
      console.error('UPDATE QUANTITY ERROR:', error.message);
      if (error.message.includes('Cannot modify cart with status')) {
        return res.status(400).json({
          success: false,
          message: error.message,
          cartStatus: cart.status,
          suggestion: 'Your cart has been processed and cannot be modified.'
        });
      }
      throw error;
    }

    try {
      const io = getIO();
      io.to(`user_${userId}`).emit('cartUpdated', {
        cart: cart,
        action: 'update',
        item: { productId, quantity, variant }
      });
    } catch (socketError) {
      console.error('Socket emission error:', socketError);
    }

    res.status(200).json({
      success: true,
      message: 'Cart updated successfully',
      cart: {
        items: cart.items,
        totalItems: cart.totalItems,
        totalAmount: cart.totalAmount,
        lastUpdated: cart.lastUpdated
      }
    });

  } catch (error) {
    console.error('Update cart error:', error);
    res.status(500).json({
      message: error.message || 'Server error while updating cart'
    });
  }
};

/**
 * Remove item from cart
 * @route DELETE /api/cart/remove
 * @access Private
 */
exports.removeItem = async (req, res) => {
  try {
    const { productId, variant = null } = req.body;
    const userId = req.user._id;

    if (!productId) {
      return res.status(400).json({
        message: 'Product ID is required'
      });
    }

    let cart = await Cart.findOne({
      user: userId,
      status: { $in: ['active', 'processing'] }
    });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'No cart found',
        suggestion: 'Create a new cart by adding items'
      });
    }

    if (cart.status === 'processing') {
      cart.status = 'active';
      cart.orderId = null;
      await cart.save();
    }

    const itemExists = cart.items.some(item => {
      const productMatch = item.product.toString() === productId.toString();
      const variantMatch = (item.variant === variant) ||
        (item.variant === null && variant === null) ||
        (item.variant === undefined && variant === null) ||
        (item.variant === null && variant === undefined);
      return productMatch && variantMatch;
    });

    if (!itemExists) {
      return res.status(404).json({
        success: false,
        message: 'Item not found in cart',
        debug: {
          searchingFor: { productId, variant },
          cartItems: cart.items.map(item => ({
            productId: item.product.toString(),
            variant: item.variant
          })),
          cartStatus: cart.status
        }
      });
    }

    try {
      cart.removeItem(productId, variant);
      await cart.save();
      await cart.populate('items.product');
    } catch (error) {
      if (error.message.includes('Cannot modify cart with status')) {
        return res.status(400).json({
          success: false,
          message: error.message,
          cartStatus: cart.status,
          suggestion: 'Your cart has been processed and cannot be modified.'
        });
      }
      throw error;
    }

    try {
      const io = getIO();
      io.to(`user_${userId}`).emit('cartUpdated', {
        cart: cart,
        action: 'remove',
        item: { productId, variant }
      });
    } catch (socketError) {
      console.error('Socket emission error:', socketError);
    }

    res.status(200).json({
      success: true,
      message: 'Item removed from cart successfully',
      cart: {
        items: cart.items,
        totalItems: cart.totalItems,
        totalAmount: cart.totalAmount,
        lastUpdated: cart.lastUpdated
      }
    });

  } catch (error) {
    console.error('Remove item error:', error);
    res.status(500).json({
      message: 'Server error while removing item from cart'
    });
  }
};

/**
 * Clear entire cart
 * @route DELETE /api/cart/clear
 * @access Private
 */
exports.clearCart = async (req, res) => {
  try {
    const userId = req.user._id;

    let cart = await Cart.findOne({
      user: userId,
      status: { $in: ['active', 'processing'] }
    });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'No cart found'
      });
    }

    if (cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cart is already empty'
      });
    }

    if (cart.status === 'processing') {
      cart.status = 'active';
      cart.orderId = null;
      await cart.save();
    }

    try {
      cart.clearCart();
      await cart.save();
    } catch (error) {
      if (error.message.includes('Cannot modify cart with status')) {
        return res.status(400).json({
          success: false,
          message: error.message,
          cartStatus: cart.status,
          suggestion: 'Your cart has been processed and cannot be cleared.'
        });
      }
      throw error;
    }

    try {
      const io = getIO();
      io.to(`user_${userId}`).emit('cartUpdated', {
        cart: cart,
        action: 'clear'
      });
    } catch (socketError) {
      console.error('Socket emission error:', socketError);
    }

    res.status(200).json({
      success: true,
      message: 'Cart cleared successfully',
      cart: {
        items: cart.items,
        totalItems: cart.totalItems,
        totalAmount: cart.totalAmount,
        lastUpdated: cart.lastUpdated
      }
    });

  } catch (error) {
    console.error('Clear cart error:', error);
    res.status(500).json({
      message: 'Server error while clearing cart'
    });
  }
};

/**
 * Clear entire cart
 * @route DELETE /api/cart/clear
 * @access Private
 */
exports.clearCart = async (req, res) => {
  try {
    const userId = req.user._id;

    let cart = await Cart.findOne({ user: userId, status: 'active' });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'No active cart found'
      });
    }

    if (cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cart is already empty'
      });
    }

    try {
      cart.clearCart();
      await cart.save();
    } catch (error) {
      if (error.message.includes('Cannot modify cart with status')) {
        return res.status(400).json({
          success: false,
          message: error.message,
          cartStatus: cart.status,
          suggestion: 'Your cart has been processed and cannot be cleared.'
        });
      }
      throw error;
    }

    try {
      const io = getIO();
      io.to(`user_${userId}`).emit('cartUpdated', {
        cart: cart,
        action: 'clear'
      });
    } catch (socketError) {
      console.error('Socket emission error:', socketError);
    }

    res.status(200).json({
      success: true,
      message: 'Cart cleared successfully',
      cart: {
        items: cart.items,
        totalItems: cart.totalItems,
        totalAmount: cart.totalAmount,
        lastUpdated: cart.lastUpdated
      }
    });

  } catch (error) {
    console.error('Clear cart error:', error);
    res.status(500).json({
      message: 'Server error while clearing cart'
    });
  }
};

/**
 * Get user's cart history (completed carts)
 * @route GET /api/cart/history
 * @access Private
 */
exports.getCartHistory = async (req, res) => {
  try {
    const userId = req.user._id;
    const { page = 1, limit = 10 } = req.query;

    const carts = await Cart.find({
      user: userId,
      status: { $in: ['completed', 'processing'] }
    })
      .populate('items.product')
      .populate('orderId')
      .sort({ updatedAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Cart.countDocuments({
      user: userId,
      status: { $in: ['completed', 'processing'] }
    });

    res.status(200).json({
      success: true,
      data: {
        carts: carts.map(cart => ({
          _id: cart._id,
          items: cart.items,
          totalItems: cart.totalItems,
          totalAmount: cart.totalAmount,
          status: cart.status,
          orderId: cart.orderId,
          createdAt: cart.createdAt,
          updatedAt: cart.updatedAt
        })),
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Get cart history error:', error);
    res.status(500).json({
      message: 'Server error while retrieving cart history'
    });
  }
};

/**
 * Create order from cart (checkout)
 * @route POST /api/cart/checkout
 * @access Private
 */
exports.checkoutCart = async (req, res) => {
  try {
    const userId = req.user._id;
    const { shippingCost = 0, shippingAddress = null, orderId = null } = req.body;

    if (orderId) {
      const Order = require('../models/Order');
      const existingOrder = await Order.findOne({
        _id: orderId,
        user: userId
      });

      if (existingOrder) {
        existingOrder.shippingCost = 0;
        existingOrder.tax = 0;
        existingOrder.totalAmount = existingOrder.subtotal;

        if (shippingAddress) {
          existingOrder.shippingAddress = shippingAddress;
        }

        await existingOrder.save();

        return res.status(200).json({
          success: true,
          message: 'Existing order found and updated',
          order: {
            _id: existingOrder._id,
            orderNumber: existingOrder.orderNumber,
            items: existingOrder.items,
            subtotal: existingOrder.subtotal,
            shippingCost: existingOrder.shippingCost,
            tax: existingOrder.tax,
            totalAmount: existingOrder.totalAmount,
            orderStatus: existingOrder.orderStatus,
            paymentStatus: existingOrder.paymentStatus,
            paymentIntentId: existingOrder.paymentIntentId,
            createdAt: existingOrder.createdAt
          }
        });
      }
    }

    const cart = await Cart.findOne({
      user: userId,
      status: { $in: ['active', 'processing'] }
    }).populate('items.product');

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No cart found or cart is empty'
      });
    }

    if (cart.status === 'processing' && cart.orderId) {
      const Order = require('../models/Order');
      const existingOrder = await Order.findById(cart.orderId);

      if (existingOrder) {
        existingOrder.shippingCost = 0;
        existingOrder.tax = 0;
        existingOrder.totalAmount = existingOrder.subtotal;

        if (shippingAddress) {
          existingOrder.shippingAddress = shippingAddress;
        }

        await existingOrder.save();

        return res.status(200).json({
          success: true,
          message: 'Existing order found and updated for payment retry',
          order: {
            _id: existingOrder._id,
            orderNumber: existingOrder.orderNumber,
            items: existingOrder.items,
            subtotal: existingOrder.subtotal,
            shippingCost: existingOrder.shippingCost,
            tax: existingOrder.tax,
            totalAmount: existingOrder.totalAmount,
            orderStatus: existingOrder.orderStatus,
            paymentStatus: existingOrder.paymentStatus,
            paymentIntentId: existingOrder.paymentIntentId,
            createdAt: existingOrder.createdAt
          }
        });
      } else {
        cart.status = 'active';
        cart.orderId = null;
        await cart.save();
      }
    }

    const Order = require('../models/Order');
    const orderItems = cart.items.map(item => ({
      product: item.product._id,
      quantity: item.quantity,
      price: item.product.price,
      totalPrice: item.product.price * item.quantity,
      variant: item.variant
    }));

    const subtotal = cart.totalAmount;
    const tax = 0;
    const totalAmount = subtotal;

    const order = new Order({
      user: userId,
      items: orderItems,
      subtotal: subtotal,
      shippingCost: 0,
      tax: tax,
      totalAmount: totalAmount,
      orderStatus: 'pending',
      paymentStatus: 'pending',
      shippingAddress: shippingAddress,
      paymentIntentId: null
    });

    await order.save();
    cart.markAsProcessing(order._id);
    await cart.save();

    try {
      const io = getIO();
      io.to(`user_${userId}`).emit('cartCheckedOut', {
        orderId: order._id,
        orderNumber: order.orderNumber,
        totalAmount: totalAmount
      });
    } catch (socketError) {
    }

    res.status(200).json({
      success: true,
      message: 'Order created successfully',
      order: {
        _id: order._id,
        orderNumber: order.orderNumber,
        items: orderItems,
        subtotal: subtotal,
        shippingCost: 0,
        tax: tax,
        totalAmount: totalAmount,
        orderStatus: order.orderStatus,
        paymentStatus: order.paymentStatus,
        createdAt: order.createdAt
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error while creating order',
      error: error.message
    });
  }
};