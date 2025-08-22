const mongoose = require('mongoose');

const attributeSchema = new mongoose.Schema({
  name: String,
  value: String
});

const variantSchema = new mongoose.Schema({
  name: String,
  price: Number,
  stock: Number,
  sku: String,
  attributes: [attributeSchema]
});

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true
  },
  slug: {
    type: String,
    unique: true
  },
  description: {
    type: String,
    required: [true, 'Product description is required']
  },
  shortDescription: String,
  price: {
    type: Number,
    required: [true, 'Product price is required']
  },
  priceBeforeDiscount: {
    type: Number,
    validate: {
      validator: function (v) {
        return !v || v >= this.price;
      },
      message: 'Price before discount must be greater than or equal to current price'
    }
  },
  discountPercentage: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: [true, 'Product category is required']
  },
  maker: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Maker',
    required: [true, 'Product maker is required']
  },
  tags: [String],
  images: [{
    type: String,
    required: true
  }],
  mainImage: {
    type: String,
    required: [true, 'Main product image is required']
  },
  sku: {
    type: String,
    required: [true, 'SKU is required'],
    unique: true
  },
  stock: {
    type: Number,
    required: [true, 'Stock quantity is required'],
    min: 0
  },
  attributes: [attributeSchema],
  variants: [variantSchema],
  featured: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  averageRating: {
    type: Number,
    default: 0
  },
  numReviews: {
    type: Number,
    default: 0
  },
  reviews: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Review'
  }]
}, {
  timestamps: true
});

productSchema.pre('save', function (next) {
  if (this.isModified('name')) {
    this.slug = this.name.toLowerCase().replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-');
  }

  if (this.priceBeforeDiscount && this.priceBeforeDiscount > this.price) {
    this.discountPercentage = Math.round(((this.priceBeforeDiscount - this.price) / this.priceBeforeDiscount) * 100);
  }

  next();
});

productSchema.methods.updateReviewStats = async function () {
  const Review = mongoose.model('Review');
  const reviews = await Review.find({ product: this._id });

  this.numReviews = reviews.length;
  this.averageRating = reviews.length > 0
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
    : 0;

  await this.save();
};

module.exports = mongoose.model('Product', productSchema);