const mongoose = require('mongoose');

const makerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Maker name is required'],
    trim: true
  },
  location: {
    type: String,
    required: [true, 'Maker location is required'],
    trim: true
  },
  image: {
    type: String,
    required: [true, 'Maker image is required']
  },
  specialties: [{
    type: String,
    trim: true
  }],
  aboutMe: {
    type: String,
    required: [true, 'About me description is required'],
    trim: true
  },
  joinDate: {
    type: Date,
    default: Date.now
  },
  website: {
    type: String,
    trim: true,
    validate: {
      validator: function (v) {
        return !v || /^https?:\/\/.+/.test(v);
      },
      message: 'Website must be a valid URL'
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  totalProducts: {
    type: Number,
    default: 0
  },
  message: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Create slug before saving
makerSchema.pre('save', function (next) {
  if (this.isModified('name')) {
    this.slug = this.name.toLowerCase().replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-');
  }
  next();
});

module.exports = mongoose.model('Maker', makerSchema);