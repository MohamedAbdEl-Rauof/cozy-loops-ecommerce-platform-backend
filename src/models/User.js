const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const addressSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['shipping', 'billing'],
    default: 'shipping'
  },
  street: {
    type: String,
    required: [true, 'Street address is required']
  },
  city: {
    type: String,
    required: [true, 'City is required']
  },
  state: {
    type: String,
    required: [true, 'State is required']
  },
  zipCode: {
    type: String,
    required: [true, 'Zip code is required']
  },
  country: {
    type: String,
    required: [true, 'Country is required']
  },
  isDefault: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please provide a valid email'
    ]
  },
  password: {
    type: String,
    required: function () {
      return !this.googleId && this.authProvider === 'local';
    },
    minlength: [8, 'Password must be at least 8 characters'],
    select: false
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  phoneNumber: String,
  addresses: [addressSchema],
  emailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: String,
  emailVerificationExpire: Date,
  active: {
    type: Boolean,
    default: true
  },
  refreshToken: String,
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  Avatar: {
    type: String,
    default: 'https://media.istockphoto.com/id/1337144146/vector/default-avatar-profile-icon-vector.jpg?s=612x612&w=0&k=20&c=BIbFwuv7FxTWvh5S3vB6bkT0Qv8Vn8N5Ffseq84ClGI='
  },
  otp: {
    code: {
      type: String,
      select: false
    },
    expiresAt: {
      type: Date,
      select: false
    }
  },
  googleId: {
    type: String,
    sparse: true,
    unique: true
  },
  linkedinId: {
    type: String,
    unique: true,
    sparse: true
  },
  profilePicture: {
    type: String
  },
  authProvider: {
    type: String,
    enum: ['local', 'google', 'linkedin'],
    default: 'local'
  },
}, {
  timestamps: true
});

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ emailVerificationToken: 1 });
userSchema.index({ resetPasswordToken: 1 });
userSchema.index({ googleId: 1 }, { sparse: true });
userSchema.index({ linkedinId: 1 }, { sparse: true });
userSchema.index({ createdAt: 1 });
userSchema.index({ emailVerified: 1, active: 1 });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();

  try {
    const saltRounds = process.env.NODE_ENV === 'production' ? 10 : 12;
    const salt = await bcrypt.genSalt(saltRounds);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  if (!this.password) return false;
  return await bcrypt.compare(enteredPassword, this.password);
};

userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');

  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  this.resetPasswordExpire = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

const User = mongoose.model('User', userSchema);

module.exports = User;