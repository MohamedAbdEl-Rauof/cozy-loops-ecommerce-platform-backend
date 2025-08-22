const { body, param } = require('express-validator');

exports.createMakerValidation = [
  body('name')
    .notEmpty()
    .withMessage('Maker name is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('Maker name must be between 2 and 50 characters'),

  body('location')
    .notEmpty()
    .withMessage('Maker location is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Location must be between 2 and 100 characters'),

  body('image')
    .notEmpty()
    .withMessage('Maker image is required')
    .isURL()
    .withMessage('Image must be a valid URL'),

  body('specialties')
    .isArray({ min: 1 })
    .withMessage('At least one specialty is required'),

  body('specialties.*')
    .isLength({ min: 2, max: 50 })
    .withMessage('Each specialty must be between 2 and 50 characters'),

  body('aboutMe')
    .notEmpty()
    .withMessage('About me description is required')
    .isLength({ min: 50, max: 1000 })
    .withMessage('About me must be between 50 and 1000 characters'),

  body('website')
    .optional()
    .isURL()
    .withMessage('Website must be a valid URL'),

  body('joinDate')
    .optional()
    .isISO8601()
    .withMessage('Join date must be a valid date')
];

exports.updateMakerValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid maker ID'),

  body('name')
    .optional()
    .isLength({ min: 2, max: 50 })
    .withMessage('Maker name must be between 2 and 50 characters'),

  body('location')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('Location must be between 2 and 100 characters'),

  body('image')
    .optional()
    .isURL()
    .withMessage('Image must be a valid URL'),

  body('specialties')
    .optional()
    .isArray({ min: 1 })
    .withMessage('At least one specialty is required'),

  body('specialties.*')
    .optional()
    .isLength({ min: 2, max: 50 })
    .withMessage('Each specialty must be between 2 and 50 characters'),

  body('aboutMe')
    .optional()
    .isLength({ min: 50, max: 1000 })
    .withMessage('About me must be between 50 and 1000 characters'),

  body('website')
    .optional()
    .isURL()
    .withMessage('Website must be a valid URL'),

  body('joinDate')
    .optional()
    .isISO8601()
    .withMessage('Join date must be a valid date')
];