const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { getUser, updateProfile, updatePassword } = require('../controllers/userController');
const rateLimit = require('express-rate-limit');

const passwordUpdateLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 3,
    message: 'Too many password update attempts, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
});

const profileUpdateLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: 'Too many profile update attempts, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
});

router.get('/me', protect, getUser);
router.put('/profile', protect, profileUpdateLimit, updateProfile);
router.put('/password', protect, passwordUpdateLimit, updatePassword);

module.exports = router;

