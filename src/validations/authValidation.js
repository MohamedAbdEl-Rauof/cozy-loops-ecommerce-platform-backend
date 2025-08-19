const { body } = require('express-validator');

/**
 * Validation rules for user registration
 */
const registerValidation = [
  body('firstName')
    .trim()
    .notEmpty()
    .withMessage('First name is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),

  body('lastName')
    .trim()
    .notEmpty()
    .withMessage('Last name is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters'),

  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),

body('password')
  .trim()
  .notEmpty()
  .withMessage('Password is required')
  .isLength({ min: 8 })
  .withMessage('Password must be at least 8 characters')
  .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&_()#^])[A-Za-z\d@$!%*?&_()#^]+$/)
  .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character')
];

/**
 * Validation rules for user login
 */
const loginValidation = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),

  body('password')
    .trim()
    .notEmpty()
    .withMessage('Password is required')
];

/**
 * Validation rules for password reset
 */
const resetPasswordValidation = [
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*])/).withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),

];

const otpVaildation = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email'),
  body('otp')
    .isLength({ min: 6, max: 6 })
    .isNumeric()
    .withMessage('OTP must be a 6-digit number'),
];


module.exports = {
  registerValidation,
  loginValidation,
  resetPasswordValidation,
  otpVaildation
};