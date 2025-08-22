const jwt = require('jsonwebtoken');

/**
 * Generate JWT access token
 */
const generateAccessToken = (payload) => {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('Payload must be a plain object');
  }
  return jwt.sign(payload, process.env.JWT_ACCESS_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRES_IN
  });
};

/**
 * Generate JWT refresh token
 */
const generateRefreshToken = (payload) => {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('Payload must be a plain object');
  }
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN
  });
};

/**
 * Verify JWT token
 */
const verifyToken = (token, secret) => {
  return jwt.verify(token, secret);
};

/**
 *Set Authentication cookies
 */

const setTokenCookies = (res, accessToken, refreshToken) => {
  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV,
    maxAge: 15 * 60 * 1000,
    sameSite: 'Strict'
  });

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    sameSite: 'Strict',
    path: '/api/auth/refresh-token'
  });
  return { accessToken, refreshToken };
}

/**
 * Clear Token cookies
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