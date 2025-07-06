const { Category, Product } = require('../models');

// Get all categories
exports.getAllCategories = async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true })
      .populate('parent', 'name slug')
      .sort({ sortOrder: 1, name: 1 });

    res.json({
      success: true,
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

// Get category by ID or slug with products
exports.getCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;

    const category = await Category.findOne({
      $or: [{ _id: id }, { slug: id }],
      isActive: true
    }).populate('parent', 'name slug');

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Get subcategories
    const subcategories = await Category.find({
      parent: category._id,
      isActive: true
    }).sort({ sortOrder: 1, name: 1 });

    // Get products in this category
    const products = await Product.find({ 
      category: category._id, 
      isActive: true 
    })
      .populate('category', 'name slug')
      .populate('maker', 'name slug location image')
      .sort({ featured: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalProducts = await Product.countDocuments({ 
      category: category._id, 
      isActive: true 
    });

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
    res.status(500).json({
      success: false,
      message: 'Error fetching category',
      error: error.message
    });
  }
};