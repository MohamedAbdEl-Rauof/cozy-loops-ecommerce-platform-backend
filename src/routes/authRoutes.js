const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { registerValidation, loginValidation, resetPasswordValidation } = require('../validations/authValidation');
const { protect } = require('../middleware/authMiddleware');

// Register a new user
router.post('/register', registerValidation, authController.register);

// Verify email
router.get('/verify-email/:token', authController.verifyEmail);

// Resend verification email
router.post('/resend-verification', authController.resendVerification);

// Login user
router.post('/login', loginValidation, authController.login);

// Logout user (protected route)
router.post('/logout', protect, authController.logout);

// Refresh access token - Make sure this function exists in authController
router.post('/refresh-token', authController.refreshToken);

// Forgot password - Make sure this function exists in authController
router.post('/forgot-password', authController.forgotPassword);

// Reset password with token - Make sure this function exists in authController
router.post('/reset-password/:token', resetPasswordValidation, authController.resetPassword);

module.exports = router;