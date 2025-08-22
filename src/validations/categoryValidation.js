const { body, param } = require('express-validator');

exports.createCategoryValidation = [
  body('name')
    .notEmpty()
    .withMessage('Category name is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('Category name must be between 2 and 50 characters'),

  body('description')
    .notEmpty()
    .withMessage('Category description is required')
    .isLength({ min: 10, max: 500 })
    .withMessage('Description must be between 10 and 500 characters'),

  body('shortDescription')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Short description cannot exceed 100 characters'),

  body('buttonText')
    .optional()
    .isLength({ max: 30 })
    .withMessage('Button text cannot exceed 30 characters'),

  body('image')
    .notEmpty()
    .withMessage('Category image is required')
    .isURL()
    .withMessage('Image must be a valid URL'),

  body('heroImage')
    .notEmpty()
    .withMessage('Hero image is required')
    .isURL()
    .withMessage('Hero image must be a valid URL'),

  body('parent')
    .optional()
    .isMongoId()
    .withMessage('Parent must be a valid MongoDB ID'),

  body('featured')
    .optional()
    .isBoolean()
    .withMessage('Featured must be a boolean'),

  body('sortOrder')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Sort order must be a positive integer')
];

exports.updateCategoryValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid category ID'),

  body('name')
    .optional()
    .isLength({ min: 2, max: 50 })
    .withMessage('Category name must be between 2 and 50 characters'),

  body('description')
    .optional()
    .isLength({ min: 10, max: 500 })
    .withMessage('Description must be between 10 and 500 characters'),

  body('shortDescription')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Short description cannot exceed 100 characters'),

  body('buttonText')
    .optional()
    .isLength({ max: 30 })
    .withMessage('Button text cannot exceed 30 characters'),

  body('image')
    .optional()
    .isURL()
    .withMessage('Image must be a valid URL'),

  body('heroImage')
    .optional()
    .isURL()
    .withMessage('Hero image must be a valid URL'),

  body('parent')
    .optional()
    .isMongoId()
    .withMessage('Parent must be a valid MongoDB ID'),

  body('featured')
    .optional()
    .isBoolean()
    .withMessage('Featured must be a boolean'),

  body('sortOrder')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Sort order must be a positive integer')
];