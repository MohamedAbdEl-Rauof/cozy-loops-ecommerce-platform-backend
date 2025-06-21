const jwt = require('jsonwebtoken');

/**
 * Generate JWT access token
 * @param {Object} payload 
 * @returns {String}  Access token
 */
const generateAccessToken = (payload) => {
  // Check if payload is provided
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('Payload must be a plain object');
  }
  return jwt.sign(payload, process.env.JWT_ACCESS_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRES_IN 
  });
};

/**
 * Generate JWT refresh token
 * @param {Object} payload 
 * @returns {String} Refresh token
 */
const generateRefreshToken = (payload) => {
  // Check if payload is provided
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('Payload must be a plain object');
  }
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN 
  });
};

/**
 * Verify JWT token
 * @param {String} token  JWT token
 * @param {String} secret JWT secret key
 * @returns {Object} Decoded token payload
 */
const verifyToken = (token, secret) => {
  return jwt.verify(token, secret);
};

/**
 *Set Authentication cookies
 * @param {Object} res - Express response object
 * @returns {String}  accessToken - JWT access token
 * @returns {String}  refreshToken - JWT refresh token
 */

 const setTokenCookies = (res, accessToken, refreshToken) => {
  // set access Token
  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 15 * 60 * 1000 ,
    sameSite: 'Strict' 
  });

  // set refresh Token
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000, 
    sameSite: 'Strict' ,
    path : '/api/auth/refresh-token'
  });
  return { accessToken, refreshToken };
}

/**
 * Clear Token cookies
 * @param {Object} res - Express response object
 */
exports.clearTokenCookies = (res) => {
  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  setTokenCookies
};