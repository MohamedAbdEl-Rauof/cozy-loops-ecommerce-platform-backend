const bcrypt = require('bcryptjs');
const { validationResult } = require('express-validator');
const User = require('../models/User');
const { generateAccessToken, generateRefreshToken, verifyToken } = require('../utils/jwtUtils');
const {
  sendEmail,
  generateVerificationToken,
  createVerificationUrl,
  createVerificationEmailHtml
} = require('../utils/emailUtils');

/**
 * Register a new user
 * @route POST /api/auth/register
 * @access Public
 */
exports.register = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { firstName, lastName, email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // Generate verification token
    const verificationToken = generateVerificationToken();
    const verificationExpire = Date.now() + 24 * 60 * 60 * 1000;

    // Create new user
    const user = new User({
      firstName,
      lastName,
      email,
      password,
      emailVerificationToken: verificationToken,
      emailVerificationExpire: verificationExpire,
    });

    // Save user to database
    await user.save();

    // Create verification URL
    const verificationUrl = createVerificationUrl(verificationToken);

    // Create email content
    const emailHtml = createVerificationEmailHtml(firstName, verificationUrl);

   try {
      // Send verification email
      await sendEmail({
        to: email,
        subject: 'Verify Your Email - Cozy Loops',
        html: emailHtml
      });
      
      res.status(201).json({
        message: 'User registered successfully. Please check your email to verify your account.',
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role
        }
      });
    } catch (emailError) {
      console.error('Email sending error:', emailError);
      
      // Still create the user but inform about email issue
      res.status(201).json({
        message: 'User registered successfully but there was an issue sending the verification email. Please use the resend verification option.',
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role
        },
        emailError: true
      });
    }
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
};

/**
 * Verify email
 * @route GET /api/auth/verify-email/:token
 * @access Public
 */
exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;
    
    // Find user with matching verification token and not expired
    const user = await User.findOne({
      emailVerificationToken: token,
      emailVerificationExpire: { $gt: Date.now() }
    });
    
    if (!user) {
      return res.status(400).json({ 
        message: 'Invalid or expired verification token' 
      });
    }
    
    // Update user verification status
    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpire = undefined;
    
    await user.save();
    
    // Redirect to frontend or return success
    if (req.query.redirect === 'true') {
      return res.redirect(`${process.env.FRONTEND_URL}/login?verified=true`);
    }
    
    res.status(200).json({ 
      message: 'Email verified successfully. You can now log in.' 
    });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ message: 'Server error during email verification' });
  }
};

/**
 * Resend verification email
 * @route POST /api/auth/resend-verification
 * @access Public
 */
exports.resendVerification = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }
    
    // Find user by email
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    if (user.emailVerified) {
      return res.status(400).json({ message: 'Email is already verified' });
    }
    
    // Generate new verification token
    const verificationToken = generateVerificationToken();
    const verificationExpire = Date.now() + 24 * 60 * 60 * 1000; 
    
    // Update user with new token
    user.emailVerificationToken = verificationToken;
    user.emailVerificationExpire = verificationExpire;
    await user.save();
    
    // Create verification URL
    const verificationUrl = createVerificationUrl(verificationToken);
    
    // Create email content
    const emailHtml = createVerificationEmailHtml(user.firstName, verificationUrl);
    
    try {
      // Send verification email
      await sendEmail({
        to: email,
        subject: 'Verify Your Email - Cozy Loops',
        html: emailHtml
      });
      
      res.status(200).json({ 
        message: 'Verification email sent successfully. Please check your email.' 
      });
    } catch (emailError) {
      console.error('Email sending error:', emailError);
      res.status(500).json({ 
        message: 'Failed to send verification email. Please try again later.' 
      });
    }
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({ message: 'Server error during resend verification' });
  }
};

/**
 * Login user
 * @route POST /api/auth/login
 * @access Public
 */
exports.login = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email }).select('+password');

    // Check if user exists
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check if email is verified
    if (!user.emailVerified) {
      return res.status(401).json({
        message: 'Please verify your email before logging in',
        isVerified: false
      });
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate tokens
    const accessToken = generateAccessToken({
      id: user._id,
      role: user.role
    });

    const refreshToken = generateRefreshToken({
      id: user._id
    });

    // Save refresh token to user
    user.refreshToken = refreshToken;
    await user.save();

    // Set cookies
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.status(200).json({
      message: 'Login successful',
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role
      },
      accessToken
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
};

/**
 * Logout user
 * @route POST /api/auth/logout
 * @access Private
 */
exports.logout = async (req, res) => {
  try {
    // Clear refresh token in database if user is authenticated
    if (req.user) {
      const user = await User.findById(req.user.id);
      if (user) {
        user.refreshToken = undefined;
        await user.save();
      }
    }

    // Clear cookies
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');

    res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Server error during logout' });
  }
};

/**
 * Refresh access token
 * @route POST /api/auth/refresh-token
 * @access Public
 */
exports.refreshToken = async (req, res) => {
  try {
    // Get refresh token from cookie
    const refreshToken = req.cookies.refreshToken;
    
    if (!refreshToken) {
      return res.status(401).json({ message: 'Refresh token not found' });
    }
    
    try {
      // Verify refresh token
      const decoded = verifyToken(
        refreshToken, 
        process.env.JWT_REFRESH_SECRET || 'refresh_secret_key_change_in_production'
      );
      
      // Find user with matching refresh token
      const user = await User.findOne({ 
        _id: decoded.id,
        refreshToken: refreshToken
      });
      
      if (!user) {
        return res.status(401).json({ message: 'Invalid refresh token' });
      }
      
      // Generate new access token
      const accessToken = generateAccessToken({
        id: user._id,
        role: user.role
      });
      
      // Set new access token cookie
      res.cookie('accessToken', accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 15 * 60 * 1000 // 15 minutes
      });
      
      res.status(200).json({
        message: 'Access token refreshed',
        accessToken
      });
    } catch (error) {
      console.error('Token verification error:', error);
      return res.status(401).json({ message: 'Invalid refresh token' });
    }
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({ message: 'Server error during token refresh' });
  }
};

/**
 * Forgot password - send reset email
 * @route POST /api/auth/forgot-password
 * @access Public
 */
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }
    
    // Find user by email
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found with this email' });
    }
    
    // Generate reset token
    const resetToken = generateVerificationToken();
    
    // Set reset token and expiration
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpire = Date.now() + 60 * 60 * 1000; // 1 hour
    
    await user.save();
    
    // Create reset URL
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
    
    // Create email content
    const emailHtml = `
      <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
        <h2 style="color: #333; text-align: center;">Reset Your Password</h2>
        <p>Hello ${user.firstName},</p>
        <p>You requested to reset your password. Please click the button below to set a new password:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #4CAF50; color: white; padding: 12px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">Reset Password</a>
        </div>
        <p>If the button doesn't work, you can also click on the link below or copy and paste it into your browser:</p>
        <p><a href="${resetUrl}">${resetUrl}</a></p>
        <p>This reset link will expire in 1 hour.</p>
        <p>If you did not request a password reset, please ignore this email and your password will remain unchanged.</p>
        <p>Best regards,<br>The Cozy Loops Team</p>
      </div>
    `;
    
    try {
      // Send reset email
      await sendEmail({
        to: email,
        subject: 'Password Reset - Cozy Loops',
        html: emailHtml
      });
      
      res.status(200).json({ 
        message: 'Password reset email sent successfully. Please check your email.' 
      });
    } catch (emailError) {
      console.error('Email sending error:', emailError);
      
      // Reset the token if email fails
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save();
      
      res.status(500).json({ 
        message: 'Failed to send password reset email. Please try again later.' 
      });
    }
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Server error during password reset request' });
  }
};

/**
 * Reset password
 * @route POST /api/auth/reset-password/:token
 * @access Public
 */
exports.resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;
    
    if (!password) {
      return res.status(400).json({ message: 'Password is required' });
    }
    
    // Find user with matching reset token and not expired
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpire: { $gt: Date.now() }
    });
    
    if (!user) {
      return res.status(400).json({ 
        message: 'Invalid or expired reset token' 
      });
    }
    
    // Update password
    user.password = password;
    
    // Clear reset token fields
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    
    await user.save();
    
    res.status(200).json({ 
      message: 'Password reset successful. You can now log in with your new password.' 
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Server error during password reset' });
  }
};