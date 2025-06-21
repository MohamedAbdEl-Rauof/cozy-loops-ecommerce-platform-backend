const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  variant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product.variants'
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  }
}, {
  timestamps: true
});

const cartSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  sessionId: {
    type: String,
    required: function() {
      return !this.user; // Required if no user is provided (for guest carts)
    }
  },
  items: [cartItemSchema]
}, {
  timestamps: true
});

// Ensure either user or sessionId is provided
cartSchema.pre('validate', function(next) {
  if (!this.user && !this.sessionId) {
    next(new Error('Cart must have either a user or a sessionId'));
  } else {
    next();
  }
});

// Create indexes for better performance
cartSchema.index({ user: 1 });
cartSchema.index({ sessionId: 1 });

const Cart = mongoose.model('Cart', cartSchema);

module.exports = Cart;