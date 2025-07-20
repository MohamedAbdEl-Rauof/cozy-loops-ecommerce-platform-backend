const express = require('express');
const {
    getCart,
    addToCart,
    updateCartItem,
    removeFromCart,
    clearCart
} = require('../controllers/cartController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.route('/')
    .get(getCart)
    .post(addToCart)
    .put(updateCartItem)
    .delete(clearCart);

router.delete('/item/:productId', removeFromCart);

module.exports = router;