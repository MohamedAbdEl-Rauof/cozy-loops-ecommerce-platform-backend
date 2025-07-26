const { body, validationResult } = require('express-validator');
const mongoose = require('mongoose');

// Helper function to handle validation errors
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            message: 'Validation failed',
            errors: errors.array().map(error => ({
                field: error.path,
                message: error.msg,
                value: error.value
            }))
        });
    }
    next();
};

// Validate add to cart request
const validateAddToCart = [
    body('productId')
        .notEmpty()
        .withMessage('Product ID is required')
        .custom((value) => {
            if (!mongoose.Types.ObjectId.isValid(value)) {
                throw new Error('Invalid product ID format');
            }
            return true;
        }),
    
    body('quantity')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Quantity must be a positive integer between 1 and 100')
        .toInt(),
    
    body('variant')
        .optional()
        .isString()
        .trim()
        .isLength({ max: 50 })
        .withMessage('Variant must be a string with maximum 50 characters'),
    
    handleValidationErrors
];

// Validate update quantity request
const validateUpdateQuantity = [
    body('productId')
        .notEmpty()
        .withMessage('Product ID is required')
        .custom((value) => {
            if (!mongoose.Types.ObjectId.isValid(value)) {
                throw new Error('Invalid product ID format');
            }
            return true;
        }),
    
    body('quantity')
        .isInt({ min: 0, max: 100 })
        .withMessage('Quantity must be an integer between 0 and 100 (0 to remove item)')
        .toInt(),
    
    body('variant')
        .optional()
        .isString()
        .trim()
        .isLength({ max: 50 })
        .withMessage('Variant must be a string with maximum 50 characters'),
    
    handleValidationErrors
];

// Validate remove item request
const validateRemoveItem = [
    body('productId')
        .notEmpty()
        .withMessage('Product ID is required')
        .custom((value) => {
            if (!mongoose.Types.ObjectId.isValid(value)) {
                throw new Error('Invalid product ID format');
            }
            return true;
        }),
    
    body('variant')
        .optional()
        .isString()
        .trim()
        .isLength({ max: 50 })
        .withMessage('Variant must be a string with maximum 50 characters'),
    
    handleValidationErrors
];

// Validate cart item existence (middleware for update/remove operations)
const validateCartItemExists = async (req, res, next) => {
    try {
        const { productId, variant = null } = req.body;
        const userId = req.user._id;
        
        const Cart = require('../models/Cart');
        const cart = await Cart.findOne({ user: userId });
        
        if (!cart) {
            return res.status(404).json({
                message: 'Cart not found'
            });
        }
        
        const itemExists = cart.items.some(item =>
            item.product.toString() === productId.toString() &&
            item.variant === variant
        );
        
        if (!itemExists) {
            return res.status(404).json({
                message: 'Item not found in cart'
            });
        }
        
        next();
    } catch (error) {
        console.error('Cart item validation error:', error);
        res.status(500).json({
            message: 'Server error while validating cart item'
        });
    }
};

// Rate limiting validation (prevent spam)
const validateCartOperationRate = (req, res, next) => {
    // This could be enhanced with Redis for production
    const userKey = req.user._id.toString();
    const now = Date.now();
    
    // Simple in-memory rate limiting (use Redis in production)
    if (!global.cartOperations) {
        global.cartOperations = new Map();
    }
    
    const userOperations = global.cartOperations.get(userKey) || [];
    
    // Remove operations older than 1 minute
    const recentOperations = userOperations.filter(time => now - time < 60000);
    
    // Allow max 30 operations per minute
    if (recentOperations.length >= 30) {
        return res.status(429).json({
            message: 'Too many cart operations. Please slow down.'
        });
    }
    
    // Add current operation
    recentOperations.push(now);
    global.cartOperations.set(userKey, recentOperations);
    
    next();
};

module.exports = {
    validateAddToCart,
    validateUpdateQuantity,
    validateRemoveItem,
    validateCartItemExists,
    validateCartOperationRate,
    handleValidationErrors
};