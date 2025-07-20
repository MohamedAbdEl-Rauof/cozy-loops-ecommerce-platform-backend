const express = require('express');
const router = express.Router();
const {
  getAllMakers,
  getMaker,
  getMakerProducts,
} = require('../controllers/makerController');


// Public routes
router.get('/', getAllMakers);
router.get('/:id', getMaker);
router.get('/:id/products', getMakerProducts);


module.exports = router;