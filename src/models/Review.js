const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required']
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: [true, 'Product is required']
  },
  comment: {
    type: String,
    required: [true, 'Review comment is required'],
    trim: true,
    maxlength: [1000, 'Comment cannot exceed 1000 characters']
  },
  rating: {
    type: Number,
    required: [true, 'Rating is required'],
    min: [1, 'Rating must be at least 1'],
    max: [5, 'Rating cannot exceed 5']
  },
  likes: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    type: {
      type: String,
      enum: ['like', 'dislike'],
      required: true
    }
  }],
  likesCount: {
    type: Number,
    default: 0
  },
  dislikesCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

reviewSchema.index({ user: 1, product: 1 }, { unique: true });

reviewSchema.pre('save', function(next) {
  this.likesCount = this.likes.filter(like => like.type === 'like').length;
  this.dislikesCount = this.likes.filter(like => like.type === 'dislike').length;
  next();
});

reviewSchema.set('toJSON', {
  transform: function(doc, ret) {
    delete ret.name;
    delete ret.image;
    return ret;
  }
});

module.exports = mongoose.model('Review', reviewSchema);