const express = require('express');
const {
    createReview,
    getProductReviews,
    updateReview,
    deleteReview,
    likeDislikeReview,
    getAllUsersReviews
} = require('../controllers/reviewController');
const { protect } = require('../middleware/authMiddleware');
const { validateLikeDislike, validateUpdateReview } = require('../validations/reviewValidation');

const router = express.Router();

router.get('/user', getAllUsersReviews);

// Apply protection to ALL routes
router.use(protect);

// Specific routes MUST come before parameterized routes
router.get('/product/:productIdentifier', protect, getProductReviews);

router.route('/')
    .post(createReview);

// Parameterized routes come last
router.route('/:id')
    .put(validateUpdateReview, updateReview)
    .delete(deleteReview);

router.post('/:id/like', validateLikeDislike, likeDislikeReview);

module.exports = router;