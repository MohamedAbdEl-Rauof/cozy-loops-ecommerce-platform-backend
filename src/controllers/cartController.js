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
    await cart.addItem(productId, quantity, product.price, variant);
    await cart.save();

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
        items: cart.items,
        totalItems: cart.totalItems,
        totalAmount: cart.totalAmount,
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

    // Update item quantity
    await cart.updateItemQuantity(productId, quantity, variant);
    await cart.save();
    await cart.populate('items.product');

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
    cart.removeItem(productId, variant);
    await cart.save();
    await cart.populate('items.product');

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
    cart.clearCart();
    await cart.save();

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