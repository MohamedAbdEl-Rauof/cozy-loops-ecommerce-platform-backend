const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  getUserOrders,
  getOrderById,
  getOrderByNumber,
  updateOrderStatus,
  cancelOrder
} = require('../controllers/orderController');

// Apply authentication middleware to all routes
router.use(protect);

// Order routes
router.route('/')
  .get(getUserOrders);

router.route('/number/:orderNumber')
  .get(getOrderByNumber);

router.route('/:id')
  .get(getOrderById)
  .put(updateOrderStatus);

router.route('/:id/cancel')
  .put(cancelOrder);

module.exports = router;