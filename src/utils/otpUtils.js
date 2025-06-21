const crypto = require('crypto');
const bcrypt = require('bcryptjs');

/**
 * Generate a random 6-digit OTP
 * @returns {String} 6-digit OTP
 */
exports.generateOTP = () => {
  // Generate a random 6-digit number
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Hash OTP for secure storage
 * @param {String} otp - Plain OTP
 * @returns {String} Hashed OTP
 */
exports.hashOTP = async (otp) => {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(otp, salt);
};

/**
 * Verify OTP
 * @param {String} plainOTP - Plain OTP provided by user
 * @param {String} hashedOTP - Hashed OTP from database
 * @returns {Boolean} True if OTP matches
 */
exports.verifyOTP = async (plainOTP, hashedOTP) => {
  return await bcrypt.compare(plainOTP, hashedOTP);
};

/**
 * Generate a secure reset token
 * @returns {String} Reset token
 */
exports.generateResetToken = () => {
  return crypto.randomBytes(32).toString('hex');
};