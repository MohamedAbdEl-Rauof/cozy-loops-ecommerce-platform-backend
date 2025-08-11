const {
  createPaymentIntent,
  verifyPayment
} = require('../controllers/paymentController');
const { protect } = require('../middleware/authMiddleware');
const express = require('express');
const router = express.Router();

router.post('/checkout', protect, createPaymentIntent);
router.post('/create-intent', protect, createPaymentIntent);

router.post('/verify', protect, verifyPayment);

module.exports = router;