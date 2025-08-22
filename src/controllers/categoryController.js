const { Category, Product } = require('../models');
const mongoose = require('mongoose');

/**
 * Get all active categories
 * @route GET /api/categories
 * @access Public
 */
exports.getAllCategories = async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true })
      .populate('parent', 'name slug')
      .sort({ sortOrder: 1, name: 1 });

    res.json({
      success: true,
      count: categories.length,
      data: categories
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching categories',
      error: error.message
    });
  }
};

/**
 * Get a single category with its subcategories and products
 * @route GET /api/categories/:id
 * @access Public
 */
exports.getCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;

    const isValidObjectId = mongoose.Types.ObjectId.isValid(id);

    let query;
    if (isValidObjectId) {
      query = {
        $or: [{ _id: id }, { slug: id }],
        isActive: true
      };
    } else {
      query = {
        slug: id,
        isActive: true
      };
    }

    const category = await Category.findOne(query).populate('parent', 'name slug');

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    const subcategories = await Category.find({
      parent: category._id,
      isActive: true
    }).sort({ sortOrder: 1, name: 1 });

    let products = [];
    let totalProducts = 0;

    try {
      products = await Product.find({
        category: category._id,
        isActive: true
      })
        .populate('category', 'name slug')
        .sort({ featured: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit);

      totalProducts = await Product.countDocuments({
        category: category._id,
        isActive: true
      });
    } catch (productError) {
      console.error('Product operations skipped:', productError.message);
    }

    res.json({
      success: true,
      data: {
        category,
        subcategories,
        products,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalProducts / limit),
          totalItems: totalProducts,
          hasNext: page < Math.ceil(totalProducts / limit),
          hasPrev: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Error in getCategory:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching category',
      error: error.message
    });
  }
};