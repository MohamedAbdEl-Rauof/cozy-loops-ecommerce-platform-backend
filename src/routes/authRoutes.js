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

// Refresh access token 
router.post('/refresh-token', authController.refreshToken);

// Forgot password (OTP Generation)
router.post('/forgot-password', authController.forgotPassword);

// Verify OTP and get reset token
router.post('/verify-otp', authController.verifyOTP);

// Reset password with token 
router.post('/reset-password/:token', resetPasswordValidation, authController.resetPassword);

module.exports = router;