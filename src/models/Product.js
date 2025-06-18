const mongoose = require('mongoose');
const slugify = require('slugify');

// Product attribute schema
const attributeSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    value: {
        type: String,
        required: true
    }
});

// Product variant schema
const variantSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    sku: {
        type: String,
        required: true,
        unique: true
    },
    price: {
        type: Number,
        required: true
    },
    image: String
}, {
    timestamps: true
});

// Variant attribute schema
const variantAttributeSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    value: {
        type: String,
        required: true
    }
});

// Add variant attributes to variant schema
variantSchema.add({
    attributes: [variantAttributeSchema]
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
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        required: [true, 'Product category is required']
    },
    tags: [String],
    images: [String],
    mainImage: String,
    sku: {
        type: String,
        required: [true, 'SKU is required'],
        unique: true
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
}, {
    timestamps: true
});

// Create indexes for better performance
productSchema.index({ slug: 1 });
productSchema.index({ name: 'text', description: 'text' });
productSchema.index({ price: 1 });
productSchema.index({ createdAt: -1 });
productSchema.index({ category: 1 });

const Product = mongoose.model('Product', productSchema);

module.exports = Product;