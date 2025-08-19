const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { registerValidation, loginValidation, resetPasswordValidation } = require('../validations/authValidation');
const { protect } = require('../middleware/authMiddleware');

router.post('/register', registerValidation, authController.register);

router.get('/verify-email/:token', authController.verifyEmail);
    
router.post('/resend-verification', authController.resendVerification);

router.post('/login', loginValidation, authController.login);

router.post('/logout', protect, authController.logout);

router.post('/refresh-token', authController.refreshToken);

router.post('/forgot-password', authController.forgotPassword);

router.post('/verify-otp', authController.verifyOTP);

router.post('/reset-password/:token', resetPasswordValidation, authController.resetPassword);

router.post('/google', authController.googleAuth);

router.post('/linkedin/callback', authController.linkedinCallback);

module.exports = router;