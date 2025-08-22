const User = require('../models/User');

/**
 * Get all addresses for current user
 * @route GET /api/addresses
 * @access Private
 */
exports.getAddresses = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('addresses');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      count: user.addresses.length,
      addresses: user.addresses
    });
  } catch (error) {
    console.error('Get addresses error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching addresses'
    });
  }
};

/**
 * Create new address
 * @route POST /api/addresses
 * @access Private
 */
exports.createAddress = async (req, res) => {
  try {
    const { type, address, city, state, zipCode, country, isDefault } = req.body;

    if (!address || !city || !state || !zipCode || !country) {
      return res.status(400).json({
        success: false,
        message: 'All address fields are required'
      });
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (isDefault && type) {
      user.addresses.forEach(addr => {
        if (addr.type === type) {
          addr.isDefault = false;
        }
      });
    }

    const newAddress = {
      type: type || 'shipping',
      street: address,
      city,
      state,
      zipCode,
      country,
      isDefault: isDefault || user.addresses.filter(a => a.type === (type || 'shipping')).length === 0
    };

    user.addresses.push(newAddress);
    await user.save();

    const createdAddress = user.addresses[user.addresses.length - 1];

    res.status(201).json({
      success: true,
      message: 'Address created successfully',
      address: createdAddress
    });
  } catch (error) {
    console.error('Create address error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating address'
    });
  }
};

/**
 * Update address
 * @route PUT /api/addresses/:id
 * @access Private
 */
exports.updateAddress = async (req, res) => {
  try {
    const { id } = req.params;
    const { type, address, city, state, zipCode, country, isDefault } = req.body;

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const addressToUpdate = user.addresses.id(id);

    if (!addressToUpdate) {
      return res.status(404).json({
        success: false,
        message: 'Address not found'
      });
    }

    if (isDefault && type) {
      user.addresses.forEach(addr => {
        if (addr.type === type && addr._id.toString() !== id) {
          addr.isDefault = false;
        }
      });
    }

    if (type) addressToUpdate.type = type;
    if (address) addressToUpdate.street = address;
    if (city) addressToUpdate.city = city;
    if (state) addressToUpdate.state = state;
    if (zipCode) addressToUpdate.zipCode = zipCode;
    if (country) addressToUpdate.country = country;
    if (isDefault !== undefined) addressToUpdate.isDefault = isDefault;

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Address updated successfully',
      address: addressToUpdate
    });
  } catch (error) {
    console.error('Update address error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating address'
    });
  }
};

/**
 * Delete address
 * @route DELETE /api/addresses/:id
 * @access Private
 */
exports.deleteAddress = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const addressToDelete = user.addresses.id(id);

    if (!addressToDelete) {
      return res.status(404).json({
        success: false,
        message: 'Address not found'
      });
    }

    user.addresses.pull(id);
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Address deleted successfully'
    });
  } catch (error) {
    console.error('Delete address error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting address'
    });
  }
};