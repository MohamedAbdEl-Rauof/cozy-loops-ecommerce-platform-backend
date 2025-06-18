const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { registerValidation, loginValidation } = require('../validations/authValidation');
const { protect } = require('../middleware/authMiddleware');

// Register a new user
router.post('/register', registerValidation, authController.register);

// Login user
router.post('/login', loginValidation, authController.login);

// Logout user (protected route)
router.post('/logout', protect, authController.logout);

module.exports = router;