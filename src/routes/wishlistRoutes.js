const express = require('express');
const router = express.Router();
const {
  addToWishlist,
  getWishlist,
  removeFromWishlist,
} = require('../controllers/wishlistController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/', getWishlist);

router.post('/add', addToWishlist);

router.delete('/remove', removeFromWishlist);

module.exports = router;