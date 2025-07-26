const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  createPaymentIntent,
  verifyPayment
} = require('../controllers/paymentController');

router.post('/checkout', protect, createPaymentIntent);

router.post('/verify', protect, verifyPayment);

module.exports = router;