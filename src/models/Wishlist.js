const mongoose = require('mongoose');

const wishlistSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  items: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  totalItems: {
    type: Number,
    default: 0
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

wishlistSchema.pre('save', function(next) {
  this.totalItems = this.items.length;
  this.lastUpdated = new Date();
  next();
});

wishlistSchema.statics.findOrCreateWishlist = async function(userId) {
  let wishlist = await this.findOne({ user: userId }).populate('items.product');
  
  if (!wishlist) {
    wishlist = new this({ user: userId });
    await wishlist.save();
    await wishlist.populate('items.product');
  }
  
  return wishlist;
};

wishlistSchema.methods.addItem = function(productId) {
  const existingItem = this.items.find(item => 
    item.product._id.toString() === productId.toString()
  );
  
  if (existingItem) {
    throw new Error('Item already exists in wishlist');
  }
  
  this.items.push({
    product: productId,
    addedAt: new Date()
  });
};

wishlistSchema.methods.removeItem = function(productId) {
  this.items = this.items.filter(item => 
    item.product._id.toString() !== productId.toString()
  );
};

wishlistSchema.methods.clearWishlist = function() {
  this.items = [];
};

wishlistSchema.methods.hasProduct = function(productId) {
  return this.items.some(item => 
    item.product._id.toString() === productId.toString()
  );
};

module.exports = mongoose.model('Wishlist', wishlistSchema);