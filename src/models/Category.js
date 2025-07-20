const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Category name is required'],
    unique: true,
    trim: true
  },
  slug: {
    type: String,
    unique: true
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  buttonText: {
    type: String,
    trim: true,
    default: function () {
      return `Shop ${this.name}`;
    }
  },
  image: {
    type: String,
    required: [true, 'Category image is required']
  },
  heroTitle: {
    type: String,
    trim: true,
    required: [true, 'Hero section title is required']
  },
  heroDescription: {
    type: String,
    trim: true,
    required: [true, 'Hero section description is required']
  },
  heroImage: {
    type: String,
    required: [true, 'Hero section image is required']
  },
  parent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    default: null
  },
  level: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  featured: {
    type: Boolean,
    default: false
  },
  sortOrder: {
    type: Number,
    default: 0
  },
  productCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Set level based on parent before saving 
categorySchema.pre('save', async function(next) {
  if (this.isModified('name')) {
    this.slug = this.name.toLowerCase().replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-');
  }
  
  if (this.parent) {
    const parentCategory = await this.constructor.findById(this.parent);
    this.level = parentCategory ? parentCategory.level + 1 : 0;
  } else {
    this.level = 0;
  }
  
  next();
});

// Create indexes for better performance
categorySchema.index({ slug: 1 });
categorySchema.index({ parent: 1 });
categorySchema.index({ name: 1 });
categorySchema.index({ isActive: 1 });
categorySchema.index({ sortOrder: 1 });

const Category = mongoose.model('Category', categorySchema);

module.exports = Category;