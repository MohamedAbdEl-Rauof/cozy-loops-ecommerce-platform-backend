const { body, param } = require('express-validator');

exports.createProductValidation = [
  body('name')
    .notEmpty()
    .withMessage('Product name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Product name must be between 2 and 100 characters'),

  body('description')
    .notEmpty()
    .withMessage('Product description is required')
    .isLength({ min: 20, max: 2000 })
    .withMessage('Description must be between 20 and 2000 characters'),

  body('shortDescription')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Short description cannot exceed 200 characters'),

  body('price')
    .isFloat({ min: 0.01 })
    .withMessage('Price must be a positive number'),

  body('priceBeforeDiscount')
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage('Price before discount must be a positive number'),

  body('category')
    .isMongoId()
    .withMessage('Valid category ID is required'),

  body('maker')
    .isMongoId()
    .withMessage('Valid maker ID is required'),

  body('images')
    .isArray({ min: 1 })
    .withMessage('At least one product image is required'),

  body('images.*')
    .isURL()
    .withMessage('Each image must be a valid URL'),

  body('mainImage')
    .notEmpty()
    .withMessage('Main image is required')
    .isURL()
    .withMessage('Main image must be a valid URL'),

  body('sku')
    .notEmpty()
    .withMessage('SKU is required')
    .isLength({ min: 3, max: 50 })
    .withMessage('SKU must be between 3 and 50 characters'),

  body('stock')
    .isInt({ min: 0 })
    .withMessage('Stock must be a non-negative integer'),

  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),

  body('featured')
    .optional()
    .isBoolean()
    .withMessage('Featured must be a boolean')
];

exports.updateProductValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid product ID'),

  body('name')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('Product name must be between 2 and 100 characters'),

  body('description')
    .optional()
    .isLength({ min: 20, max: 2000 })
    .withMessage('Description must be between 20 and 2000 characters'),

  body('shortDescription')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Short description cannot exceed 200 characters'),

  body('price')
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage('Price must be a positive number'),

  body('priceBeforeDiscount')
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage('Price before discount must be a positive number'),

  body('category')
    .optional()
    .isMongoId()
    .withMessage('Valid category ID is required'),

  body('maker')
    .optional()
    .isMongoId()
    .withMessage('Valid maker ID is required'),

  body('images')
    .optional()
    .isArray({ min: 1 })
    .withMessage('At least one product image is required'),

  body('images.*')
    .optional()
    .isURL()
    .withMessage('Each image must be a valid URL'),

  body('mainImage')
    .optional()
    .isURL()
    .withMessage('Main image must be a valid URL'),

  body('sku')
    .optional()
    .isLength({ min: 3, max: 50 })
    .withMessage('SKU must be between 3 and 50 characters'),

  body('stock')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Stock must be a non-negative integer'),

  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),

  body('featured')
    .optional()
    .isBoolean()
    .withMessage('Featured must be a boolean')
];