const express = require('express');
const {
    createReview,
    getProductReviews,
    updateReview,
    deleteReview,
    likeDislikeReview,
    getUserReviews
} = require('../controllers/reviewController');
const { protect } = require('../middleware/authMiddleware');
const { validateReview, validateLikeDislike, validateUpdateReview } = require('../validations/reviewValidation');

const router = express.Router();

// Apply protection to ALL routes
router.use(protect);

// Specific routes MUST come before parameterized routes
router.get('/user', getUserReviews);
router.get('/product/:productId', getProductReviews);

router.route('/')
    .post(validateReview, createReview);

// Parameterized routes come last
router.route('/:id')
    .put(validateUpdateReview, updateReview)
    .delete(deleteReview);

router.post('/:id/like', validateLikeDislike, likeDislikeReview);

module.exports = router;