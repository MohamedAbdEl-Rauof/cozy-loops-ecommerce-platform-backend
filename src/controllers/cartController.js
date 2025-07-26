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

    // Validate input
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

    // Get product details
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        message: 'Product not found'
      });
    }

    // Check if product is available
    if (!product.isActive) {
      return res.status(400).json({
        message: 'Product is not available'
      });
    }

    // Find or create cart
    let cart = await Cart.findOrCreateCart(userId);

    // Add item to cart
    try {
      await cart.addItem(productId, quantity, product.price, variant);
      await cart.save();
    } catch (error) {
      if (error.message.includes('Cannot modify cart with status')) {
        return res.status(400).json({
          success: false,
          message: error.message,
          cartStatus: cart.status,
          suggestion: 'Your previous cart has been processed. A new cart will be created for you.'
        });
      }
      throw error;
    }

    // Populate cart items for response
    await cart.populate('items.product');

    // Emit real-time update
    try {
      const io = getIO();
      io.to(`user_${userId}`).emit('cartUpdated', {
        cart: cart,
        action: 'add',
        item: { productId, quantity, variant }
      });
    } catch (socketError) {
      console.error('Socket emission error:', socketError);
      // Continue without failing the request
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

    const cart = await Cart.findOrCreateCart(userId);

    res.status(200).json({
      success: true,
      cart: {
        _id: cart._id,
        items: cart.items,
        totalItems: cart.totalItems,
        totalAmount: cart.totalAmount,
        status: cart.status,
        orderId: cart.orderId,
        lastUpdated: cart.lastUpdated
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

    // Validate input
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

    // Find cart
    let cart = await Cart.findOne({ user: userId });
    if (!cart) {
      return res.status(404).json({
        message: 'Cart not found'
      });
    }

    // Find the specific item in cart with better comparison
    const itemIndex = cart.items.findIndex(item => {
      const productMatch = item.product.toString() === productId.toString();
      const variantMatch = (item.variant === variant) || 
                          (item.variant === null && variant === null) ||
                          (item.variant === undefined && variant === null);
      return productMatch && variantMatch;
    });

    if (itemIndex === -1) {
      return res.status(404).json({
        message: 'Item not found in cart',
        debug: {
          searchingFor: { productId, variant },
          cartItems: cart.items.map(item => ({
            productId: item.product.toString(),
            variant: item.variant
          }))
        }
      });
    }

    // Update item quantity
    try {
      await cart.updateItemQuantity(productId, quantity, variant);
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

    // Emit real-time update
    try {
      const io = getIO();
      io.to(`user_${userId}`).emit('cartUpdated', {
        cart: cart,
        action: 'update',
        item: { productId, quantity, variant }
      });
    } catch (socketError) {
      console.error('Socket emission error:', socketError);
      // Continue without failing the request
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

    // Validate input
    if (!productId) {
      return res.status(400).json({
        message: 'Product ID is required'
      });
    }

    // Find cart
    let cart = await Cart.findOne({ user: userId });
    if (!cart) {
      return res.status(404).json({
        message: 'Cart not found'
      });
    }

    // Check if item exists in cart
    const itemExists = cart.items.some(item =>
      item.product.toString() === productId.toString() &&
      item.variant === variant
    );

    if (!itemExists) {
      return res.status(404).json({
        message: 'Item not found in cart'
      });
    }

    // Remove item from cart
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

    // Emit real-time update
    try {
      const io = getIO();
      io.to(`user_${userId}`).emit('cartUpdated', {
        cart: cart,
        action: 'remove',
        item: { productId, variant }
      });
    } catch (socketError) {
      console.error('Socket emission error:', socketError);
      // Continue without failing the request
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

    // Find cart
    let cart = await Cart.findOne({ user: userId });
    if (!cart) {
      return res.status(404).json({
        message: 'Cart not found'
      });
    }

    // Check if cart is already empty
    if (cart.items.length === 0) {
      return res.status(400).json({
        message: 'Cart is already empty'
      });
    }

    // Clear cart
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

    // Emit real-time update
    try {
      const io = getIO();
      io.to(`user_${userId}`).emit('cartUpdated', {
        cart: cart,
        action: 'clear'
      });
    } catch (socketError) {
      console.error('Socket emission error:', socketError);
      // Continue without failing the request
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
