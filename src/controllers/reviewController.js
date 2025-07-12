const mongoose = require('mongoose');
const Review = require('../models/Review');
const Product = require('../models/Product');
const User = require('../models/User');
const asyncHandler = require('express-async-handler');

// @desc    Create a new review
// @route   POST /api/reviews
// @access  Private
const createReview = asyncHandler(async (req, res) => {
    const { productId, comment, rating } = req.body;
    const userId = req.user._id;

    const product = await Product.findById(productId);
    if (!product) {
        res.status(404);
        throw new Error('Product not found');
    }

    const existingReview = await Review.findOne({ user: userId, product: productId });
    if (existingReview) {
        res.status(400);
        throw new Error('You have already reviewed this product. You can update your existing review instead.');
    }

    const user = await User.findById(userId);
    if (!user) {
        res.status(404);
        throw new Error('User not found');
    }

    const reviewData = {
        user: userId,
        product: productId,
        comment,
        rating: Number(rating)
    };

    const review = await Review.create(reviewData);

    await product.updateReviewStats();

    await review.populate('user', 'firstName lastName Avatar');

    res.status(201).json({
        success: true,
        data: review
    });
});

// @desc    Get all reviews for a product
// @route   GET /api/reviews/product/:productId
// @access  Private (Now Protected)
const getProductReviews = asyncHandler(async (req, res) => {
    const { productId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const sort = req.query.sort || '-createdAt';

    // Validate productId format
    if (!mongoose.Types.ObjectId.isValid(productId)) {
        res.status(400);
        throw new Error('Invalid product ID format');
    }

    const product = await Product.findById(productId);
    if (!product) {
        res.status(404);
        throw new Error('Product not found');
    }

    const reviews = await Review.find({ product: productId })
        .populate('user', 'firstName lastName Avatar')
        .sort(sort)
        .limit(limit * 1)
        .skip((page - 1) * limit);

    const total = await Review.countDocuments({ product: productId });

    if (total === 0) {
        return res.json({
            success: true,
            message: 'No reviews found for this product',
            data: [],
            pagination: {
                page,
                limit,
                total: 0,
                pages: 0
            }
        });
    }

    res.json({
        success: true,
        data: reviews,
        pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
        }
    });
});

// @desc    Update user's own review
// @route   PUT /api/reviews/:id
// @access  Private
const updateReview = asyncHandler(async (req, res) => {
    const { comment, rating } = req.body;
    const reviewId = req.params.id;
    const userId = req.user._id;

    const review = await Review.findById(reviewId);

    if (!review) {
        res.status(404);
        throw new Error('Review not found');
    }

    if (review.user.toString() !== userId.toString()) {
        res.status(403);
        throw new Error('Not authorized to update this review');
    }

    const isSameComment = comment && comment.trim() === review.comment;
    const isSameRating = rating && Number(rating) === review.rating;

    if (isSameComment && isSameRating) {
        res.status(400);
        throw new Error('No changes detected. Please modify your comment or rating to update the review.');
    }

    if (isSameComment && !rating) {
        res.status(400);
        throw new Error('This comment is identical to your current review. Please make changes to update.');
    }

    if (isSameRating && !comment) {
        res.status(400);
        throw new Error('This rating is identical to your current review. Please make changes to update.');
    }

    if (comment !== undefined && comment.trim() !== review.comment) {
        review.comment = comment.trim();
    }
    if (rating !== undefined && Number(rating) !== review.rating) {
        review.rating = Number(rating);
    }

    const updatedReview = await review.save();

    const product = await Product.findById(review.product);
    await product.updateReviewStats();

    await updatedReview.populate('user', 'firstName lastName Avatar');

    res.json({
        success: true,
        data: updatedReview
    });
});

// @desc    Delete user's own review
// @route   DELETE /api/reviews/:id
// @access  Private
const deleteReview = asyncHandler(async (req, res) => {
    const reviewId = req.params.id;
    const userId = req.user._id;

    const review = await Review.findById(reviewId);

    if (!review) {
        res.status(404);
        throw new Error('Review not found');
    }

    if (review.user.toString() !== userId.toString()) {
        res.status(403);
        throw new Error('Not authorized to delete this review');
    }

    const productId = review.product;
    await Review.findByIdAndDelete(reviewId);

    const product = await Product.findById(productId);
    await product.updateReviewStats();

    res.json({
        success: true,
        message: 'Review deleted successfully'
    });
});

// @desc    Like or dislike a review
// @route   POST /api/reviews/:id/like
// @access  Private
const likeDislikeReview = asyncHandler(async (req, res) => {
    const { type } = req.body;
    const reviewId = req.params.id;
    const userId = req.user._id;

    if (!['like', 'dislike'].includes(type)) {
        res.status(400);
        throw new Error('Type must be either like or dislike');
    }

    const review = await Review.findById(reviewId);

    if (!review) {
        res.status(404);
        throw new Error('Review not found');
    }

    const existingLikeIndex = review.likes.findIndex(
        like => like.user.toString() === userId.toString()
    );

    if (existingLikeIndex > -1) {
        const existingType = review.likes[existingLikeIndex].type;

        if (existingType === type) {
            review.likes.splice(existingLikeIndex, 1);
        } else {
            review.likes[existingLikeIndex].type = type;
        }
    } else {
        review.likes.push({ user: userId, type });
    }

    await review.save();

    res.json({
        success: true,
        data: {
            likesCount: review.likesCount,
            dislikesCount: review.dislikesCount
        }
    });
});

// @desc    Get user's own reviews
// @route   GET /api/reviews/user
// @access  Private
const getUserReviews = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const reviews = await Review.find({ user: userId })
        .populate('product', 'name mainImage slug')
        .populate('user', 'firstName lastName Avatar')
        .sort('-createdAt')
        .limit(limit * 1)
        .skip((page - 1) * limit);

    const total = await Review.countDocuments({ user: userId });

    res.json({
        success: true,
        data: reviews,
        pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
        }
    });
});

module.exports = {
    createReview,
    getProductReviews,
    updateReview,
    deleteReview,
    likeDislikeReview,
    getUserReviews
};