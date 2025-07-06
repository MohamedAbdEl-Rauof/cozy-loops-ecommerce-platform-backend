const { Maker, Product } = require('../models');

// Get all makers
exports.getAllMakers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const makers = await Maker.find({ isActive: true })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Maker.countDocuments({ isActive: true });

    res.json({
      success: true,
      data: makers,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching makers',
      error: error.message
    });
  }
};

// Get maker by ID or slug
exports.getMaker = async (req, res) => {
  try {
    const { id } = req.params;
    const maker = await Maker.findOne({
      $or: [{ _id: id }, { slug: id }],
      isActive: true
    });

    if (!maker) {
      return res.status(404).json({
        success: false,
        message: 'Maker not found'
      });
    }

    res.json({
      success: true,
      data: maker
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching maker',
      error: error.message
    });
  }
};

// Get products by maker
exports.getMakerProducts = async (req, res) => {
  try {
    const { id } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;

    const maker = await Maker.findOne({
      $or: [{ _id: id }, { slug: id }],
      isActive: true
    });

    if (!maker) {
      return res.status(404).json({
        success: false,
        message: 'Maker not found'
      });
    }

    const products = await Product.find({ 
      maker: maker._id, 
      isActive: true 
    })
      .populate('category', 'name slug')
      .populate('maker', 'name slug location')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Product.countDocuments({ 
      maker: maker._id, 
      isActive: true 
    });

    res.json({
      success: true,
      data: {
        maker,
        products,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching maker products',
      error: error.message
    });
  }
};