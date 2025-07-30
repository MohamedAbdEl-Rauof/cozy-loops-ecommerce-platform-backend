const express = require('express');
const {
    addToCart,
    getCart,
    updateQuantity,
    removeItem,
    getCartHistory,
    checkoutCart
} = require('../controllers/cartController');
const { protect } = require('../middleware/authMiddleware');
const { 
    validateAddToCart, 
    validateUpdateQuantity, 
    validateRemoveItem,
    validateCartItemExists,
    validateCartOperationRate
} = require('../validations/cartValidation');

const router = express.Router();

router.use(protect);

router.use(validateCartOperationRate);

router.route('/')
    .get(getCart)

router.post('/add', validateAddToCart, addToCart);
router.put('/update', validateUpdateQuantity, validateCartItemExists, updateQuantity);
router.delete('/remove', validateRemoveItem, validateCartItemExists, removeItem);
router.get('/history', getCartHistory);
router.post('/checkout', protect,checkoutCart);

module.exports = router;
