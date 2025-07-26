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
        required: true
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
    status: {
        type: String,
        enum: ['active', 'processing', 'completed'],
        default: 'active'
    },
    orderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        default: null
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

cartSchema.pre('save', function (next) {
    this.totalItems = this.items.reduce((total, item) => total + item.quantity, 0);
    this.totalAmount = this.items.reduce((total, item) => total + item.totalPrice, 0);
    this.lastUpdated = new Date();
    next();
});

cartSchema.methods.addItem = async function (productId, quantity, price, variant = null) {
    // Check if cart is active before allowing modifications
    if (this.status !== 'active') {
        throw new Error(`Cannot modify cart with status: ${this.status}. Please create a new cart.`);
    }

    const Product = mongoose.model('Product');
    const product = await Product.findById(productId);

    if (!product) {
        throw new Error('Product not found');
    }

    // Better variant comparison to handle null/undefined cases
    const existingItemIndex = this.items.findIndex(item => {
        const productMatch = item.product.toString() === productId.toString();
        const variantMatch = (item.variant === variant) ||
            (item.variant === null && variant === null) ||
            (item.variant === undefined && variant === null) ||
            (item.variant === null && variant === undefined);
        return productMatch && variantMatch;
    });

    if (existingItemIndex > -1) {
        const newQuantity = this.items[existingItemIndex].quantity + quantity;
        this.items[existingItemIndex].quantity = newQuantity;
        this.items[existingItemIndex].totalPrice = newQuantity * price;
    } else {
        this.items.push({
            product: productId,
            variant,
            quantity,
            price,
            totalPrice: quantity * price
        });
    }

    return this;
};

cartSchema.methods.removeItem = function (productId, variant = null) {
    // Check if cart is active before allowing modifications
    if (this.status !== 'active') {
        throw new Error(`Cannot modify cart with status: ${this.status}. Please create a new cart.`);
    }

    // Better variant comparison to handle null/undefined cases
    this.items = this.items.filter(item => {
        const productMatch = item.product.toString() === productId.toString();
        const variantMatch = (item.variant === variant) ||
            (item.variant === null && variant === null) ||
            (item.variant === undefined && variant === null) ||
            (item.variant === null && variant === undefined);
        return !(productMatch && variantMatch);
    });
    return this;
};

cartSchema.methods.updateItemQuantity = async function (productId, quantity, variant = null) {
    // Check if cart is active before allowing modifications
    if (this.status !== 'active') {
        throw new Error(`Cannot modify cart with status: ${this.status}. Please create a new cart.`);
    }

    if (quantity > 0) {
        const Product = mongoose.model('Product');
        const product = await Product.findById(productId);

        if (!product) {
            throw new Error('Product not found');
        }
    }

    // Better variant comparison to handle null/undefined cases
    const itemIndex = this.items.findIndex(item => {
        const productMatch = item.product.toString() === productId.toString();
        const variantMatch = (item.variant === variant) ||
            (item.variant === null && variant === null) ||
            (item.variant === undefined && variant === null) ||
            (item.variant === null && variant === undefined);
        return productMatch && variantMatch;
    });

    if (itemIndex > -1) {
        if (quantity <= 0) {
            this.items.splice(itemIndex, 1);
        } else {
            this.items[itemIndex].quantity = quantity;
            this.items[itemIndex].totalPrice = quantity * this.items[itemIndex].price;
        }
    } else {
        throw new Error(`Item not found in cart. ProductId: ${productId}, Variant: ${variant}`);
    }

    return this;
};

cartSchema.methods.clearCart = function () {
    // Check if cart is active before allowing modifications
    if (this.status !== 'active') {
        throw new Error(`Cannot modify cart with status: ${this.status}. Please create a new cart.`);
    }

    this.items = [];
    return this;
};

cartSchema.statics.findOrCreateCart = async function (userId) {
    // First try to find an active cart
    let cart = await this.findOne({ user: userId, status: 'active' })
        .populate('items.product');

    if (!cart) {
        // If no active cart exists, create a new one
        cart = new this({
            user: userId,
            items: [],
            status: 'active'
        });
        await cart.save();
        await cart.populate('items.product');
    }

    return cart;
};


// Method to mark cart as processing (when payment intent is created)
cartSchema.methods.markAsProcessing = function (orderId) {
    if (this.status !== 'active') {
        throw new Error(`Cannot process cart with status: ${this.status}`);
    }
    this.status = 'processing';
    this.orderId = orderId;
    return this;
};

// Method to mark cart as completed (when payment is successful)
cartSchema.methods.markAsCompleted = function () {
    if (this.status !== 'processing') {
        throw new Error(`Cannot complete cart with status: ${this.status}`);
    }
    this.status = 'completed';
    return this;
};

// Method to check if cart can be used for payment
cartSchema.methods.canProcessPayment = function () {
    return this.status === 'active' && this.items.length > 0;
};

// Create compound index to ensure only one active cart per user
cartSchema.index({ user: 1, status: 1 }, { 
    unique: true, 
    partialFilterExpression: { status: 'active' }
});

// Index for efficient cart queries
cartSchema.index({ user: 1, status: 1 });
cartSchema.index({ orderId: 1 });

module.exports = mongoose.model('Cart', cartSchema);
