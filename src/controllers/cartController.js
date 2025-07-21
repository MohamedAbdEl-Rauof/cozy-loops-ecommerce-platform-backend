const Cart = require('../models/Cart');
const Product = require('../models/Product');
const { getIO } = require('../config/socket');

const getCart = async (req, res) => {
    try {
        let cart = await Cart.findOne({ user: req.user.id }).populate('items.product');

        if (!cart) {
            cart = new Cart({ user: req.user.id, items: [] });
            await cart.save();
        }

        res.status(200).json({
            success: true,
            data: cart
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

const addToCart = async (req, res) => {
    try {
        const { productId, quantity = 1, variant = null } = req.body;

        // Validate input
        if (!productId) {
            return res.status(400).json({
                success: false,
                message: 'Product ID is required'
            });
        }

        // Validate product exists and is active
        const product = await Product.findById(productId);
        if (!product || !product.isActive) {
            return res.status(404).json({
                success: false,
                message: 'Product not found or inactive'
            });
        }

        // Check stock availability
        let availableStock = product.stock;
        let price = product.price;

        if (variant) {
            const productVariant = product.variants.find(v => v.name === variant);
            if (!productVariant) {
                return res.status(400).json({
                    success: false,
                    message: 'Product variant not found'
                });
            }
            availableStock = productVariant.stock;
            price = productVariant.price;
        }

        if (availableStock < quantity) {
            return res.status(400).json({
                success: false,
                message: 'Insufficient stock'
            });
        }

        let cart = await Cart.findOne({ user: req.user.id });
        if (!cart) {
            cart = new Cart({ user: req.user.id, items: [] });
        }

        cart.addItem(productId, quantity, price, variant);
        await cart.save();

        // Populate the cart for response
        await cart.populate('items.product');

        // Emit real-time update (with error handling)
        try {
            const io = getIO();
            io.to(`user_${req.user.id}`).emit('cartUpdated', {
                type: 'ITEM_ADDED',
                cart: cart,
                addedItem: {
                    product: product,
                    quantity,
                    variant,
                    price
                }
            });
        } catch (socketError) {
            console.log('Socket not available, continuing without real-time update');
        }

        res.status(200).json({
            success: true,
            message: 'Item added to cart successfully',
            data: cart
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

const updateCartItem = async (req, res) => {
    try {
        const { productId, quantity, variant = null } = req.body;

        if (!productId || quantity === undefined) {
            return res.status(400).json({
                success: false,
                message: 'Product ID and quantity are required'
            });
        }

        const cart = await Cart.findOne({ user: req.user.id });
        if (!cart) {
            return res.status(404).json({
                success: false,
                message: 'Cart not found'
            });
        }

        cart.updateItemQuantity(productId, quantity, variant);
        await cart.save();
        await cart.populate('items.product');

        // Emit real-time update
        try {
            const io = getIO();
            io.to(`user_${req.user.id}`).emit('cartUpdated', {
                type: 'ITEM_UPDATED',
                cart: cart
            });
        } catch (socketError) {
            console.log('Socket not available, continuing without real-time update');
        }

        res.status(200).json({
            success: true,
            message: 'Cart updated successfully',
            data: cart
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

const removeFromCart = async (req, res) => {
    try {
        // Get productId from URL parameters
        const { productId, variant } = req.params;

        if (!productId) {
            return res.status(400).json({
                success: false,
                message: 'Product ID is required'
            });
        }

        const cart = await Cart.findOne({ user: req.user.id });
        if (!cart) {
            return res.status(404).json({
                success: false,
                message: 'Cart not found'
            });
        }

        // Convert 'undefined' string to null for variant
        const variantValue = variant === 'undefined' || variant === 'null' ? null : variant;

        cart.removeItem(productId, variantValue);
        await cart.save();
        await cart.populate('items.product');

        // Emit real-time update
        try {
            const io = getIO();
            io.to(`user_${req.user.id}`).emit('cartUpdated', {
                type: 'ITEM_REMOVED',
                cart: cart
            });
        } catch (socketError) {
            console.log('Socket not available, continuing without real-time update');
        }

        res.status(200).json({
            success: true,
            message: 'Item removed from cart',
            data: cart
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

const clearCart = async (req, res) => {
    try {
        const cart = await Cart.findOne({ user: req.user.id });
        if (!cart) {
            return res.status(404).json({
                success: false,
                message: 'Cart not found'
            });
        }

        cart.items = [];
        await cart.save();

        // Emit real-time update
        try {
            const io = getIO();
            io.to(`user_${req.user.id}`).emit('cartUpdated', {
                type: 'CART_CLEARED',
                cart: cart
            });
        } catch (socketError) {
            console.log('Socket not available, continuing without real-time update');
        }

        res.status(200).json({
            success: true,
            message: 'Cart cleared successfully',
            data: cart
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

module.exports = {
    getCart,
    addToCart,
    updateCartItem,
    removeFromCart,
    clearCart
};