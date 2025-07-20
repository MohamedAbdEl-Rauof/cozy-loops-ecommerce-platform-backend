const express = require('express');
const router = express.Router();
const {
  getAllCategories,
  getCategory,
} = require('../controllers/categoryController');

// Public routes
router.get('/', getAllCategories);
router.get('/:id', getCategory);


module.exports = router;