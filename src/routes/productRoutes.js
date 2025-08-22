const express = require('express');
const router = express.Router();
const {
  getAllProducts,
  getProductsByCategory,
} = require('../controllers/productController');

router.get('/', getAllProducts);
router.get('/category/:id', getProductsByCategory);

module.exports = router;