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

    // Find existing cart (active or processing) or create new active cart
    let cart = await Cart.findOne({ 
      user: userId, 
      status: { $in: ['active', 'processing'] }
    }).populate('items.product');

    console.log('🔍 ADD TO CART DEBUG:', {
      userId: userId.toString(),
      productId,
      quantity,
      variant,
      existingCart: !!cart,
      cartStatus: cart?.status,
      timestamp: new Date().toISOString()
    });

    // If no cart exists or existing cart is not active, create new active cart
    if (!cart || cart.status !== 'active') {
      console.log('🆕 CREATING NEW ACTIVE CART');
      cart = new Cart({
        user: userId,
        items: [],
        status: 'active'
      });
      await cart.save();
      await cart.populate('items.product');
      console.log('✅ NEW CART CREATED:', cart._id.toString());
    }

    // Add item to cart
    try {
      await cart.addItem(productId, quantity, product.price, variant);
      await cart.save();
    } catch (error) {
      if (error.message.includes('Cannot modify cart with status')) {
        // If current cart cannot be modified, create a new one
        cart = new Cart({
          user: userId,
          items: [],
          status: 'active'
        });
        await cart.save();
        await cart.populate('items.product');
        
        // Try adding to the new cart
        await cart.addItem(productId, quantity, product.price, variant);
        await cart.save();
      } else {
        throw error;
      }
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

    // First, try to find any existing cart (active or processing)
    let cart = await Cart.findOne({ 
      user: userId, 
      status: { $in: ['active', 'processing'] }
    }).populate('items.product');

    // If no cart exists, create a new active cart
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

    console.log('🔍 UPDATE QUANTITY DEBUG:', {
      userId: userId.toString(),
      productId,
      quantity,
      variant,
      timestamp: new Date().toISOString()
    });

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

    // Find ACTIVE cart only (this is the key fix)
    let cart = await Cart.findOne({ user: userId, status: 'active' });
    
    console.log('🛒 CART FOUND:', {
      cartExists: !!cart,
      cartId: cart?._id?.toString(),
      cartStatus: cart?.status,
      itemCount: cart?.items?.length || 0,
      items: cart?.items?.map(item => ({
        productId: item.product.toString(),
        variant: item.variant,
        quantity: item.quantity
      })) || []
    });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'No active cart found. Please add items to cart first.',
        suggestion: 'Create a new cart by adding items'
      });
    }

    // Find the specific item in cart with better comparison
    const itemIndex = cart.items.findIndex(item => {
      const productMatch = item.product.toString() === productId.toString();
      const variantMatch = (item.variant === variant) ||
        (item.variant === null && variant === null) ||
        (item.variant === undefined && variant === null) ||
        (item.variant === null && variant === undefined);
      
      console.log('🔍 ITEM COMPARISON:', {
        itemProductId: item.product.toString(),
        searchProductId: productId.toString(),
        productMatch,
        itemVariant: item.variant,
        searchVariant: variant,
        variantMatch,
        overallMatch: productMatch && variantMatch
      });
      
      return productMatch && variantMatch;
    });

    console.log('📍 ITEM INDEX RESULT:', {
      itemIndex,
      found: itemIndex !== -1
    });

    if (itemIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Item not found in active cart',
        debug: {
          searchingFor: { productId, variant },
          activeCartItems: cart.items.map(item => ({
            productId: item.product.toString(),
            variant: item.variant,
            quantity: item.quantity
          })),
          cartStatus: cart.status,
          cartId: cart._id.toString()
        }
      });
    }

    // Update item quantity
    try {
      console.log('🔄 UPDATING ITEM QUANTITY...');
      await cart.updateItemQuantity(productId, quantity, variant);
      await cart.save();
      await cart.populate('items.product');
      console.log('✅ ITEM QUANTITY UPDATED SUCCESSFULLY');
    } catch (error) {
      console.error('❌ UPDATE QUANTITY ERROR:', error.message);
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

    // Find ACTIVE cart only (key fix here too)
    let cart = await Cart.findOne({ user: userId, status: 'active' });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'No active cart found',
        suggestion: 'Create a new cart by adding items'
      });
    }

    // Check if item exists in cart with better variant comparison
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
        message: 'Item not found in active cart',
        debug: {
          searchingFor: { productId, variant },
          activeCartItems: cart.items.map(item => ({
            productId: item.product.toString(),
            variant: item.variant
          })),
          cartStatus: cart.status
        }
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

    // Find ACTIVE cart only
    let cart = await Cart.findOne({ user: userId, status: 'active' });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'No active cart found'
      });
    }

    // Check if cart is already empty
    if (cart.items.length === 0) {
      return res.status(400).json({
        success: false,
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



/**
 * Create order from cart (checkout)
 * @route POST /api/cart/checkout
 * @access Private
 */
exports.checkoutCart = async (req, res) => {
  try {
    const userId = req.user._id;
    const { shippingCost = 0, shippingAddress = null } = req.body;

    // Find active cart
    const cart = await Cart.findOne({ user: userId, status: 'active' })
      .populate('items.product');

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No active cart found or cart is empty'
      });
    }

    // Create Order model
    const Order = require('../models/Order');

    const orderItems = cart.items.map(item => ({
      product: item.product._id,
      quantity: item.quantity,
      price: item.product.price,
      totalPrice: item.product.price * item.quantity,
      variant: item.variant
    }));

    const subtotal = cart.totalAmount;
    const tax = subtotal * 0.08; // 8% tax
    const totalAmount = subtotal + shippingCost + tax;

    // Create order without paymentIntentId initially
    const order = new Order({
      user: userId,
      items: orderItems,
      subtotal: subtotal,
      shippingCost: shippingCost,
      tax: tax,
      totalAmount: totalAmount,
      orderStatus: 'pending', // Start as pending, not processing
      paymentStatus: 'pending',
      shippingAddress: shippingAddress,
      paymentIntentId: null // Will be set when payment intent is created
    });

    await order.save();

    // Mark cart as processing and link to order
    cart.markAsProcessing(order._id);
    await cart.save();

    // Emit real-time update
    try {
      const io = getIO();
      io.to(`user_${userId}`).emit('cartCheckedOut', {
        orderId: order._id,
        orderNumber: order.orderNumber,
        totalAmount: totalAmount
      });
    } catch (socketError) {
      console.error('Socket emission error:', socketError);
    }

    res.status(200).json({
      success: true,
      message: 'Order created successfully',
      order: {
        _id: order._id,
        orderNumber: order.orderNumber,
        items: orderItems,
        subtotal: subtotal,
        shippingCost: shippingCost,
        tax: tax,
        totalAmount: totalAmount,
        orderStatus: order.orderStatus,
        paymentStatus: order.paymentStatus,
        createdAt: order.createdAt
      }
    });

  } catch (error) {
    console.error('Checkout cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating order',
      error: error.message
    });
  }
};