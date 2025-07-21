const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    variant: {
        type: String,
        default: null
    },
    quantity: {
        type: Number,
        required: true,
        min: 1,
        default: 1
    },
    price: {
        type: Number,
        required: true
    },
    totalPrice: {
        type: Number,
        required: true
    }
}, {
    timestamps: true
});

const cartSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    items: [cartItemSchema],
    totalItems: {
        type: Number,
        default: 0
    },
    totalAmount: {
        type: Number,
        default: 0
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

cartSchema.pre('save', function(next) {
    this.totalItems = this.items.reduce((total, item) => total + item.quantity, 0);
    this.totalAmount = this.items.reduce((total, item) => total + item.totalPrice, 0);
    this.lastUpdated = new Date();
    next();
});

cartSchema.methods.addItem = function(productId, quantity, price, variant = null) {
    const existingItemIndex = this.items.findIndex(item =>
        item.product.toString() === productId.toString() &&
        item.variant === variant
    );

    if (existingItemIndex > -1) {
        this.items[existingItemIndex].quantity += quantity;
        this.items[existingItemIndex].totalPrice = this.items[existingItemIndex].quantity * price;
    } else {
        this.items.push({
            product: productId,
            variant,
            quantity,
            price,
            totalPrice: quantity * price
        });
    }
};

cartSchema.methods.removeItem = function(productId, variant = null) {
    this.items = this.items.filter(item =>
        !(item.product.toString() === productId.toString() && item.variant === variant)
    );
};

// Method to update item quantity
cartSchema.methods.updateItemQuantity = function(productId, quantity, variant = null) {
    const itemIndex = this.items.findIndex(item =>
        item.product.toString() === productId.toString() &&
        item.variant === variant
    );

    if (itemIndex > -1) {
        if (quantity <= 0) {
            this.items.splice(itemIndex, 1);
        } else {
            this.items[itemIndex].quantity = quantity;
            this.items[itemIndex].totalPrice = quantity * this.items[itemIndex].price;
        }
    }
};

module.exports = mongoose.model('Cart', cartSchema);