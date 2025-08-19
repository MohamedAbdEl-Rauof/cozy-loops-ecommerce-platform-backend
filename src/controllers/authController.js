const bcrypt = require('bcryptjs');
const { validationResult } = require('express-validator');
const User = require('../models/User');
const { generateAccessToken, generateRefreshToken, verifyToken, setTokenCookies } = require('../utils/jwtUtils');
const {
  sendEmail,
  generateVerificationToken,
  createVerificationUrl,
  createVerificationEmailHtml
} = require('../utils/emailUtils');
const { generateOTP, hashOTP, verifyOTP, generateResetToken } = require('../utils/otpUtils');
const { createOTPEmailHtml, createPasswordResetConfirmationHtml } = require('../utils/otpEmailTemplates');
const { verifyGoogleToken } = require('../utils/googleAuth');
const axios = require('axios');

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

    // Check for extra fields
    const allowedFields = ['firstName', 'lastName', 'email', 'password'];
    const extraFields = Object.keys(req.body).filter(field => !allowedFields.includes(field));

    if (extraFields.length > 0) {
      return res.status(400).json({
        message: `Unexpected fields: ${extraFields.join(', ')}`
      });
    }

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
    const directLogin = req.query.directLogin === 'true';

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

    // If direct login is requested, generate tokens and return them
    if (directLogin) {
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

      // Return tokens in JSON response instead of redirecting
      return res.status(200).json({
        message: 'Email verified successfully',
        token: accessToken,
        refreshToken: refreshToken,
      });
    }

    // If no direct login, redirect to login page
    return res.redirect(`${process.env.USER_FRONTEND_URL}/auth/login?verified=true`);
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
    const { email, password } = req.body;

    // Check for admin login using environment variables
    if (
      process.env.ADMIN_EMAIL &&
      process.env.ADMIN_PASSWORD &&
      email === process.env.ADMIN_EMAIL &&
      password === process.env.ADMIN_PASSWORD
    ) {
      // Find or create admin user
      let admin = await User.findOne({ email: process.env.ADMIN_EMAIL });

      if (!admin) {
        // Create admin user if it doesn't exist
        admin = await User.create({
          firstName: 'Admin',
          lastName: 'User',
          email: process.env.ADMIN_EMAIL,
          password: await bcrypt.hash(process.env.ADMIN_PASSWORD, 12),
          role: 'admin',
          emailVerified: true
        });
      } else if (admin.role !== 'admin') {
        // Ensure user has admin role
        admin.role = 'admin';
        admin.emailVerified = true;
        await admin.save();
      }

      // Generate tokens for admin 
      const accessToken = generateAccessToken({
        id: admin._id.toString(),
        role: admin.role
      });

      const refreshToken = generateRefreshToken({
        id: admin._id.toString()
      });

      // Save refresh token to admin user
      admin.refreshToken = refreshToken;
      await admin.save();

      // Set cookies
      setTokenCookies(res, accessToken, refreshToken);

      return res.status(200).json({
        success: true,
        message: 'Admin login successful',
        user: {
          id: admin._id,
          firstName: admin.firstName,
          lastName: admin.lastName,
          email: admin.email,
          role: admin.role
        },
        accessToken,
        refreshToken
      });
    }

    // Regular user login
    const user = await User.findOne({ email }).select('+password');

    // Check if user exists
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if password is correct
    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if email is verified
    if (!user.emailVerified) {
      return res.status(403).json({
        success: false,
        message: 'Email not verified. Please verify your email before logging in.',
        emailVerified: false,
        userId: user._id
      });
    }

    // Check if user is active
    if (!user.active) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Please contact support.'
      });
    }

    // Generate tokens 
    const accessToken = generateAccessToken({
      id: user._id.toString(),
      role: user.role
    });

    const refreshToken = generateRefreshToken({
      id: user._id.toString()
    });

    // Save refresh token to user
    user.refreshToken = refreshToken;
    await user.save();

    // Set cookies
    setTokenCookies(res, accessToken, refreshToken);

    // Return success response
    return res.status(200).json({
      success: true,
      message: 'Login successful',
      user: {
        id: user._id,
        email: user.email,
        role: user.role
      },
      accessToken,
      refreshToken
    });

  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
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
        process.env.JWT_REFRESH_SECRET
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
        secure: process.env.NODE_ENV,
        sameSite: 'strict',
        maxAge: 15 * 60 * 1000
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
 * Request password reset with OTP
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

    // Generate OTP
    const otp = generateOTP();

    // Hash OTP for secure storage
    const hashedOTP = await hashOTP(otp);

    // Set OTP and expiration (10 minutes)
    user.otp = {
      code: hashedOTP,
      expiresAt: Date.now() + 10 * 60 * 1000
    };

    await user.save();

    // Create email content
    const emailHtml = createOTPEmailHtml(user.firstName, otp);

    try {
      // Send OTP email
      await sendEmail({
        to: email,
        subject: 'Password Reset Code - Cozy Loops',
        html: emailHtml
      });

      res.status(200).json({
        message: 'Password reset code sent successfully. Please check your email.'
      });
    } catch (emailError) {
      console.error('Email sending error:', emailError);

      // Reset the OTP if email fails
      user.otp = undefined;
      await user.save();

      res.status(500).json({
        message: 'Failed to send password reset code. Please try again later.'
      });
    }
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Server error during password reset request' });
  }
};

/**
 * Verify OTP and issue reset token
 * @route POST /api/auth/verify-otp
 * @access Public
 */
exports.verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and OTP are required' });
    }

    // Find user by email with OTP fields
    const user = await User.findOne({ email }).select('+otp.code +otp.expiresAt');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if OTP exists and is not expired
    if (!user.otp || !user.otp.code || !user.otp.expiresAt || user.otp.expiresAt < Date.now()) {
      return res.status(400).json({
        message: 'OTP is invalid or expired. Please request a new one.'
      });
    }

    // Verify OTP
    const isOTPValid = await verifyOTP(otp, user.otp.code);

    if (!isOTPValid) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    // Generate reset token
    const resetToken = generateResetToken();

    // Set reset token and expiration (15 minutes)
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpire = Date.now() + 15 * 60 * 1000;

    // Clear OTP
    user.otp = undefined;

    await user.save();

    res.status(200).json({
      message: 'OTP verified successfully',
      resetToken
    });
  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({ message: 'Server error during OTP verification' });
  }
};

/**
 * Reset password with token
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
    }).select('+password');

    if (!user) {
      return res.status(400).json({
        message: 'Invalid or expired reset token'
      });
    }

    const isSamePassword = await bcrypt.compare(password, user.password);
    if (isSamePassword) {
      return res.status(400).json({
        message: 'New password cannot be the same as your current password'
      });
    }

    // Update password
    user.password = password;

    // Clear reset token fields
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    // Clear refresh token to invalidate all sessions (optional)
    user.refreshToken = undefined;

    await user.save();

    // Send confirmation email
    try {
      const confirmationHtml = createPasswordResetConfirmationHtml(user.firstName);

      await sendEmail({
        to: user.email,
        subject: 'Password Reset Successful - Cozy Loops',
        html: confirmationHtml
      });
    } catch (emailError) {
      console.error('Confirmation email error:', emailError);
    }

    res.status(200).json({
      message: 'Password reset successful. You can now log in with your new password.'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Server error during password reset' });
  }
};

/**
 * Google OAuth login/register
 * @route POST /api/auth/google
 * @access Public
 */
exports.googleAuth = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Google token is required'
      });
    }

    // Verify Google token
    let googleUser;
    try {
      googleUser = await verifyGoogleToken(token);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Google token'
      });
    }

    // Check if user exists with this Google ID
    let user = await User.findOne({ googleId: googleUser.googleId });
    let isNewUser = false;

    if (user) {
      // User exists with Google ID - login
      if (!user.active) {
        return res.status(403).json({
          success: false,
          message: 'Your account has been deactivated. Please contact support.'
        });
      }

      // Update user info if needed
      let updated = false;
      if (user.profilePicture !== googleUser.picture) {
        user.profilePicture = googleUser.picture;
        updated = true;
      }

      if (updated) {
        await user.save();
      }
    } else {
      // Check if user exists with same email but different auth method
      const existingUser = await User.findOne({ email: googleUser.email });

      if (existingUser) {
        // Link Google account to existing user
        existingUser.googleId = googleUser.googleId;
        existingUser.profilePicture = googleUser.picture;
        existingUser.emailVerified = true; // Google emails are verified
        await existingUser.save();
        user = existingUser;
      } else {
        // Create new user
        user = new User({
          firstName: googleUser.firstName,
          lastName: googleUser.lastName,
          email: googleUser.email,
          googleId: googleUser.googleId,
          profilePicture: googleUser.picture,
          emailVerified: true, // Google emails are verified
          authProvider: 'google',
          // No password needed for OAuth users
        });

        await user.save();
        isNewUser = true;
      }
    }

    // Generate tokens
    const accessToken = generateAccessToken({
      id: user._id.toString(),
      role: user.role
    });

    const refreshToken = generateRefreshToken({
      id: user._id.toString()
    });

    // Save refresh token to user
    user.refreshToken = refreshToken;
    await user.save();

    // Set cookies
    setTokenCookies(res, accessToken, refreshToken);

    // Return success response
    return res.status(200).json({
      success: true,
      message: 'Google authentication successful',
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        profilePicture: user.profilePicture
      },
      accessToken,
      refreshToken,
      isNewUser
    });

  } catch (error) {
    console.error('Google auth error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during Google authentication'
    });
  }
};



/**
 * LinkedIn OAuth callback
 * @route POST /api/auth/linkedin/callback
 * @access Public
 */
exports.linkedinCallback = async (req, res) => {
  try {
    const { code, state } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Authorization code is required',
        error: 'MISSING_AUTH_CODE'
      });
    }

    console.log('LinkedIn OAuth - Processing authorization code:', {
      codeLength: code.length,
      state: state,
      timestamp: new Date().toISOString()
    });

    // Exchange authorization code for access token
    const tokenResponse = await axios.post('https://www.linkedin.com/oauth/v2/accessToken', 
      new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: process.env.LINKEDIN_REDIRECT_URI,
        client_id: process.env.LINKEDIN_CLIENT_ID,
        client_secret: process.env.LINKEDIN_CLIENT_SECRET
      }).toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        timeout: 15000 // Increased timeout
      }
    );

    const { access_token, token_type, expires_in } = tokenResponse.data;

    if (!access_token) {
      console.error('LinkedIn OAuth - No access token received:', tokenResponse.data);
      return res.status(400).json({
        success: false,
        message: 'Failed to obtain access token from LinkedIn',
        error: 'LINKEDIN_TOKEN_FAILED'
      });
    }

    console.log('LinkedIn OAuth - Access token obtained successfully:', {
      tokenType: token_type,
      expiresIn: expires_in,
      timestamp: new Date().toISOString()
    });

    // Get user profile from LinkedIn
    const profileResponse = await axios.get('https://api.linkedin.com/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Accept': 'application/json'
      },
      timeout: 15000
    });

    const linkedinProfile = profileResponse.data;

    console.log('LinkedIn OAuth - Profile data received:', {
      email: linkedinProfile.email,
      name: `${linkedinProfile.given_name} ${linkedinProfile.family_name}`,
      hasProfilePicture: !!linkedinProfile.picture,
      timestamp: new Date().toISOString()
    });

    if (!linkedinProfile.email) {
      return res.status(400).json({
        success: false,
        message: 'Email not provided by LinkedIn. Please ensure email permission is granted.',
        error: 'LINKEDIN_EMAIL_MISSING'
      });
    }

    // Check if user exists with LinkedIn ID first
    let user = await User.findOne({ linkedinId: linkedinProfile.sub });
    let isNewUser = false;
    let isLinkedAccount = false;

    if (user) {
      // User exists with LinkedIn ID - update profile if needed
      console.log('LinkedIn OAuth - Existing user found by LinkedIn ID:', user._id);
      
      if (!user.active) {
        return res.status(403).json({
          success: false,
          message: 'Your account has been deactivated. Please contact support.',
          error: 'ACCOUNT_DEACTIVATED'
        });
      }

      // Update profile information
      let updated = false;
      if (user.profilePicture !== linkedinProfile.picture && linkedinProfile.picture) {
        user.profilePicture = linkedinProfile.picture;
        updated = true;
      }
      
      if (!user.emailVerified) {
        user.emailVerified = true;
        updated = true;
      }

      if (updated) {
        await user.save();
        console.log('LinkedIn OAuth - User profile updated');
      }
    } else {
      // Check if user exists with same email but different auth method
      const existingUser = await User.findOne({ email: linkedinProfile.email });

      if (existingUser) {
        // Link LinkedIn account to existing user
        console.log('LinkedIn OAuth - Linking LinkedIn to existing user:', existingUser._id);
        
        if (!existingUser.active) {
          return res.status(403).json({
            success: false,
            message: 'Your account has been deactivated. Please contact support.',
            error: 'ACCOUNT_DEACTIVATED'
          });
        }

        existingUser.linkedinId = linkedinProfile.sub;
        existingUser.profilePicture = linkedinProfile.picture || existingUser.profilePicture;
        existingUser.emailVerified = true; // LinkedIn emails are verified
        
        // Update name if not set or if LinkedIn provides more complete info
        if (!existingUser.firstName && linkedinProfile.given_name) {
          existingUser.firstName = linkedinProfile.given_name;
        }
        if (!existingUser.lastName && linkedinProfile.family_name) {
          existingUser.lastName = linkedinProfile.family_name;
        }

        await existingUser.save();
        user = existingUser;
        isLinkedAccount = true;
      } else {
        // Create new user
        console.log('LinkedIn OAuth - Creating new user for email:', linkedinProfile.email);
        
        user = new User({
          firstName: linkedinProfile.given_name || 'LinkedIn',
          lastName: linkedinProfile.family_name || 'User',
          email: linkedinProfile.email,
          linkedinId: linkedinProfile.sub,
          profilePicture: linkedinProfile.picture,
          emailVerified: true, // LinkedIn emails are verified
          authProvider: 'linkedin',
          password: await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 12), // Random secure password
          role: 'user',
          active: true
        });

        await user.save();
        isNewUser = true;
        console.log('LinkedIn OAuth - New user created:', user._id);
      }
    }

    // Generate tokens
    const accessTokenJWT = generateAccessToken({
      id: user._id.toString(),
      role: user.role
    });

    const refreshToken = generateRefreshToken({
      id: user._id.toString()
    });

    // Save refresh token to user
    user.refreshToken = refreshToken;
    user.lastLogin = new Date();
    await user.save();

    // Set cookies
    setTokenCookies(res, accessTokenJWT, refreshToken);

    console.log('LinkedIn OAuth - Authentication successful:', {
      userId: user._id,
      isNewUser,
      isLinkedAccount,
      timestamp: new Date().toISOString()
    });

    // Return success response
    return res.status(200).json({
      success: true,
      message: isNewUser 
        ? 'LinkedIn account created and authenticated successfully' 
        : isLinkedAccount 
          ? 'LinkedIn account linked and authenticated successfully'
          : 'LinkedIn authentication successful',
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        profilePicture: user.profilePicture,
        emailVerified: user.emailVerified
      },
      accessToken: accessTokenJWT,
      refreshToken,
      isNewUser,
      isLinkedAccount
    });

  } catch (error) {
    console.error('LinkedIn OAuth error:', {
      message: error.message,
      stack: error.stack,
      response: error.response?.data,
      status: error.response?.status,
      url: error.config?.url,
      timestamp: new Date().toISOString()
    });
    
    let errorMessage = 'LinkedIn authentication failed';
    let errorCode = 'LINKEDIN_AUTH_FAILED';
    let statusCode = 500;

    if (error.response?.data) {
      const linkedinError = error.response.data;
      statusCode = error.response.status;

      console.log('LinkedIn API error details:', {
        status: error.response.status,
        data: linkedinError,
        url: error.config?.url,
        headers: error.config?.headers
      });

      switch (linkedinError.error) {
        case 'invalid_request':
          errorMessage = 'Invalid LinkedIn authorization request';
          errorCode = 'LINKEDIN_INVALID_REQUEST';
          statusCode = 400;
          break;
        case 'invalid_grant':
          errorMessage = 'LinkedIn authorization code has expired or is invalid';
          errorCode = 'LINKEDIN_INVALID_GRANT';
          statusCode = 400;
          break;
        case 'invalid_client':
          errorMessage = 'LinkedIn client configuration error';
          errorCode = 'LINKEDIN_INVALID_CLIENT';
          statusCode = 500;
          break;
        case 'unauthorized_client':
          errorMessage = 'LinkedIn client not authorized';
          errorCode = 'LINKEDIN_UNAUTHORIZED_CLIENT';
          statusCode = 500;
          break;
        case 'unsupported_grant_type':
          errorMessage = 'Unsupported grant type';
          errorCode = 'LINKEDIN_UNSUPPORTED_GRANT';
          statusCode = 500;
          break;
        default:
          if (linkedinError.error_description) {
            errorMessage = linkedinError.error_description;
          }
          if (linkedinError.error) {
            errorCode = `LINKEDIN_${linkedinError.error.toUpperCase()}`;
          }
      }
    } else if (error.code === 'ECONNABORTED') {
      errorMessage = 'LinkedIn request timeout. Please try again.';
      errorCode = 'LINKEDIN_TIMEOUT';
      statusCode = 408;
    } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      errorMessage = 'Unable to connect to LinkedIn. Please try again later.';
      errorCode = 'LINKEDIN_CONNECTION_ERROR';
      statusCode = 503;
    } else if (error.name === 'ValidationError') {
      errorMessage = 'User data validation failed';
      errorCode = 'USER_VALIDATION_ERROR';
      statusCode = 400;
    }

    return res.status(statusCode).json({
      success: false,
      message: errorMessage,
      error: errorCode,
      ...(process.env.NODE_ENV === 'development' && { 
        debug: {
          originalError: error.message,
          linkedinResponse: error.response?.data
        }
      })
    });
  }
};