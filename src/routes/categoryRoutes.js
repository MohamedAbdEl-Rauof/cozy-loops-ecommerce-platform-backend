const express = require('express');
const router = express.Router();
// Import controllers later

// Routes will be implemented later
router.route('/').get((req, res) => {
  res.status(200).json({ message: 'Get all categories' });
});

module.exports = router;