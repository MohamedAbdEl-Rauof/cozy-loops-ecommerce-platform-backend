const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  getUserOrders,
  getOrderById,
  getOrderByNumber,
  getOrderForPayment
} = require('../controllers/orderController');

router.use(protect);

router.route('/')
  .get(getUserOrders);

router.route('/number/:orderNumber')
  .get(getOrderByNumber);

router.route('/:id')
  .get(getOrderById)

router.get('/:id/payment', protect, getOrderForPayment);



module.exports = router;