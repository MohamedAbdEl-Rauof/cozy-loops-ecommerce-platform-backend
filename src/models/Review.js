const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  rating: {
    type: Number,
    required: [true, 'Rating is required'],
    min: 1,
    max: 5
  },
  title: String,
  comment: String,
  isApproved: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Prevent duplicate reviews (one review per user per product)
reviewSchema.index({ product: 1, user: 1 }, { unique: true });

// Create additional indexes for better performance
reviewSchema.index({ product: 1, rating: -1 });
reviewSchema.index({ user: 1 });
reviewSchema.index({ isApproved: 1 });

// Static method to calculate average rating for a product
reviewSchema.statics.calcAverageRating = async function(productId) {
  const stats = await this.aggregate([
    {
      $match: { product: productId, isApproved: true }
    },
    {
      $group: {
        _id: '$product',
        avgRating: { $avg: '$rating' },
        numReviews: { $sum: 1 }
      }
    }
  ]);

  if (stats.length > 0) {
    await mongoose.model('Product').findByIdAndUpdate(productId, {
      averageRating: stats[0].avgRating.toFixed(1),
      numReviews: stats[0].numReviews
    });
  } else {
    await mongoose.model('Product').findByIdAndUpdate(productId, {
      averageRating: 0,
      numReviews: 0
    });
  }
};

// Call calcAverageRating after save
reviewSchema.post('save', function() {
  this.constructor.calcAverageRating(this.product);
});

// Call calcAverageRating after update
reviewSchema.post(/^findOneAnd/, async function(doc) {
  if (doc) {
    await doc.constructor.calcAverageRating(doc.product);
  }
});

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;