const jwt = require('jsonwebtoken');

/**
 * Generate JWT access token
 * @param {Object} payload 
 * @returns {String} 
 */
const generateAccessToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_ACCESS_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRES_IN 
  });
};

/**
 * Generate JWT refresh token
 * @param {Object} payload 
 * @returns {String} 
 */
const generateRefreshToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN 
  });
};

/**
 * Verify JWT token
 * @param {String} token 
 * @param {String} secret 
 * @returns {Object} 
 */
const verifyToken = (token, secret) => {
  return jwt.verify(token, secret);
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyToken
};