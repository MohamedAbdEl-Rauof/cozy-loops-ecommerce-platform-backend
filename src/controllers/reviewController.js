const mongoose = require('mongoose');
const Review = require('../models/Review');
const Product = require('../models/Product');
const User = require('../models/User');
const asyncHandler = require('express-async-handler');

// @desc    Create a new review
// @route   POST /api/reviews
// @access  Private
const createReview = asyncHandler(async (req, res) => {
    const { productSlug, comment, rating } = req.body;
    const userId = req.user._id;

    if (!productSlug || !comment || !rating) {
        res.status(400);
        throw new Error('Product slug, comment, and rating are required');
    }

    if (rating < 1 || rating > 5) {
        res.status(400);
        throw new Error('Rating must be between 1 and 5');
    }

    const product = await Product.findOne({ slug: productSlug });
    if (!product) {
        res.status(404);
        throw new Error('Product not found');
    }

    const existingReview = await Review.findOne({ user: userId, product: product._id });
    if (existingReview) {
        res.status(409);
        throw new Error('You have already reviewed this product. You can update your existing review instead.');
    }

    const user = await User.findById(userId);
    if (!user) {
        res.status(404);
        throw new Error('User not found');
    }

    // Create and save the new review
    const review = new Review({
        user: userId,
        product: product._id,
        comment: comment.trim(),
        rating: Number(rating)
    });

    const savedReview = await review.save();

    // Update product review stats after creating the review
    await product.updateReviewStats();

    // Populate user data for the response
    await savedReview.populate('user', 'firstName lastName Avatar');

    res.status(201).json({
        success: true,
        message: 'Review created successfully',
        data: savedReview
    });
});

// @desc    Get all reviews for a product
// @route   GET /api/reviews/product/:productIdentifier
// @access  Public
const getProductReviews = asyncHandler(async (req, res) => {
    const { productIdentifier } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const sort = req.query.sort || '-createdAt';
    
    const { userId } = req.query;

    let product;

    if (mongoose.Types.ObjectId.isValid(productIdentifier)) {
        product = await Product.findById(productIdentifier);
    } else {
        product = await Product.findOne({ slug: productIdentifier });
    }

    if (!product) {
        res.status(404);
        throw new Error('Product not found');
    }

    const reviews = await Review.find({ product: product._id })
        .populate('user', 'firstName lastName Avatar')
        .sort(sort)
        .limit(limit * 1)
        .skip((page - 1) * limit);

    const total = await Review.countDocuments({ product: product._id });

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

    const reviewsWithOwnership = reviews.map(review => ({
        ...review.toObject(),
        isOwner: userId && mongoose.Types.ObjectId.isValid(userId) 
            ? review.user._id.toString() === userId.toString() 
            : false
    }));

    res.json({
        success: true,
        data: reviewsWithOwnership,
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


// @desc    Get all users' reviews
// @route   GET /api/reviews/users
// @access  Public
const getAllUsersReviews = asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const sort = req.query.sort || '-createdAt';

    // Optional filters
    const { userId, productId, rating } = req.query;

    let filter = {};

    // Add filters if provided
    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
        filter.user = userId;
    }
    if (productId && mongoose.Types.ObjectId.isValid(productId)) {
        filter.product = productId;
    }
    if (rating) {
        filter.rating = Number(rating);
    }

    const reviews = await Review.find(filter)
        .populate('user', 'firstName lastName Avatar')
        .populate('product', 'name mainImage slug price')
        .sort(sort)
        .limit(limit * 1)
        .skip((page - 1) * limit);

    const total = await Review.countDocuments(filter);

    if (total === 0) {
        return res.json({
            success: true,
            message: 'No reviews found',
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


module.exports = {
    createReview,
    getProductReviews,
    updateReview,
    deleteReview,
    likeDislikeReview,
    getAllUsersReviews
};
