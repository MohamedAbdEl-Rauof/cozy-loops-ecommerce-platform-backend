const express = require('express');
const router = express.Router();
// Import controllers later
// const { getUsers, getUser, createUser, updateUser, deleteUser } = require('../controllers/userController');

// Routes will be implemented later
router.route('/').get((req, res) => {
  res.status(200).json({ message: 'Get all users' });
});

module.exports = router;