const Wishlist = require('../models/Wishlist');
const Product = require('../models/Product');
const Cart = require('../models/Cart');

/**
 * Add item to wishlist
 * @route POST /api/wishlist/add
 * @access Private
 */
exports.addToWishlist = async (req, res) => {
  try {
    const { productId } = req.body;
    const userId = req.user._id;

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: 'Product ID is required'
      });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    if (!product.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Product is not available'
      });
    }

    let wishlist = await Wishlist.findOrCreateWishlist(userId);

    if (wishlist.hasProduct(productId)) {
      return res.status(400).json({
        success: false,
        message: 'Item already exists in wishlist'
      });
    }

    wishlist.addItem(productId);
    await wishlist.save();

    await wishlist.populate('items.product');

    res.status(200).json({
      success: true,
      message: 'Item added to wishlist successfully',
      wishlist: {
        items: wishlist.items,
        totalItems: wishlist.totalItems,
        lastUpdated: wishlist.lastUpdated
      }
    });

  } catch (error) {
    console.error('Add to wishlist error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error while adding item to wishlist'
    });
  }
};

/**
 * Get user's wishlist
 * @route GET /api/wishlist
 * @access Private
 */
exports.getWishlist = async (req, res) => {
  try {
    const userId = req.user._id;

    const wishlist = await Wishlist.findOrCreateWishlist(userId);

    res.status(200).json({
      success: true,
      wishlist: {
        items: wishlist.items,
        totalItems: wishlist.totalItems,
        lastUpdated: wishlist.lastUpdated
      }
    });

  } catch (error) {
    console.error('Get wishlist error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while retrieving wishlist'
    });
  }
};

/**
 * Remove item from wishlist
 * @route DELETE /api/wishlist/remove
 * @access Private
 */
exports.removeFromWishlist = async (req, res) => {
  try {
    const { productId } = req.body;
    const userId = req.user._id;

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: 'Product ID is required'
      });
    }

    let wishlist = await Wishlist.findOne({ user: userId });
    if (!wishlist) {
      return res.status(404).json({
        success: false,
        message: 'Wishlist not found'
      });
    }

    if (!wishlist.hasProduct(productId)) {
      return res.status(404).json({
        success: false,
        message: 'Item not found in wishlist'
      });
    }

    wishlist.removeItem(productId);
    await wishlist.save();
    await wishlist.populate('items.product');

    res.status(200).json({
      success: true,
      message: 'Item removed from wishlist successfully',
      wishlist: {
        items: wishlist.items,
        totalItems: wishlist.totalItems,
        lastUpdated: wishlist.lastUpdated
      }
    });

  } catch (error) {
    console.error('Remove from wishlist error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while removing item from wishlist'
    });
  }
};