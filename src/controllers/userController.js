const User = require('../models/User');
const bcrypt = require('bcryptjs');

// Track failed password attempts (in production, use Redis or database)
const failedAttempts = new Map();

/**
 * Get current user profile
 * @route GET /api/users/me
 * @access Private
 */
exports.getUser = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        phoneNumber: user.phoneNumber,
        addresses: user.addresses,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        avatar: user.Avatar,
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Server error while fetching user data' });
  }
};

/**
 * Update user profile (basic info only)
 * @route PUT /api/users/profile
 * @access Private
 */
exports.updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, phoneNumber, avatar } = req.body;
    const userId = req.user._id;

    // Check if at least one field is provided for update
    if (!firstName && !lastName && phoneNumber === undefined && !avatar) {
      return res.status(400).json({
        message: 'At least one field (firstName, lastName, phoneNumber, or avatar) must be provided for update'
      });
    }

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Track if any changes were made
    let hasChanges = false;

    // Update fields only if they are different from current values
    if (firstName && firstName !== user.firstName) {
      user.firstName = firstName;
      hasChanges = true;
    }

    if (lastName && lastName !== user.lastName) {
      user.lastName = lastName;
      hasChanges = true;
    }

    if (phoneNumber !== undefined && phoneNumber !== user.phoneNumber) {
      user.phoneNumber = phoneNumber;
      hasChanges = true;
    }

    if (avatar && avatar !== user.Avatar) {
      user.Avatar = avatar;
      hasChanges = true;
    }

    // If no actual changes were made
    if (!hasChanges) {
      return res.status(400).json({
        message: 'No changes detected. The provided values are the same as current values.'
      });
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        phoneNumber: user.phoneNumber,
        addresses: user.addresses,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        avatar: user.Avatar,
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error while updating profile' });
  }
};

/**
 * Update user password
 * @route PUT /api/users/password
 * @access Private
 */
exports.updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user._id;
    const userKey = userId.toString();

    // Validation
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        message: 'Current password and new password are required'
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        message: 'New password must be at least 8 characters long'
      });
    }

    // Check failed attempts
    const attempts = failedAttempts.get(userKey) || { count: 0, lastAttempt: null };

    // If user has 3 or more failed attempts in the last 15 minutes, force logout
    if (attempts.count >= 3 && attempts.lastAttempt &&
      (Date.now() - attempts.lastAttempt) < 15 * 60 * 1000) {

      // Clear refresh token to force re-authentication
      await User.findByIdAndUpdate(userId, { refreshToken: null });

      return res.status(401).json({
        message: 'Too many failed password attempts. Please log in again.',
        forceLogout: true
      });
    }

    // Find user with password field
    const user = await User.findById(userId).select('+password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify current password
    const isCurrentPasswordValid = await user.matchPassword(currentPassword);

    if (!isCurrentPasswordValid) {
      // Increment failed attempts
      attempts.count += 1;
      attempts.lastAttempt = Date.now();
      failedAttempts.set(userKey, attempts);

      return res.status(400).json({
        message: 'Current password is incorrect',
        attemptsRemaining: Math.max(0, 3 - attempts.count)
      });
    }

    // Reset failed attempts on successful password verification
    failedAttempts.delete(userKey);

    // Check if new password is different from current
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      return res.status(400).json({
        message: 'New password must be different from current password'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password updated successfully'
    });

  } catch (error) {
    console.error('Update password error:', error);
    res.status(500).json({ message: 'Server error while updating password' });
  }
};

/**
 * Clear failed password attempts (utility function)
 * Can be called when user successfully logs in
 */
exports.clearFailedAttempts = (userId) => {
  failedAttempts.delete(userId.toString());
};