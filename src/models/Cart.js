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

    if (this.status !== 'active') {
        throw new Error(`Cannot modify cart with status: ${this.status}. Please create a new cart.`);
    }

    const Product = mongoose.model('Product');
    const product = await Product.findById(productId);

    if (!product) {
        throw new Error('Product not found');
    }

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
    if (this.status !== 'active') {
        throw new Error(`Cannot modify cart with status: ${this.status}. Please create a new cart.`);
    }

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
    if (this.status !== 'active') {
        throw new Error(`Cannot modify cart with status: ${this.status}. Please create a new cart.`);
    }

    this.items = [];
    return this;
};

cartSchema.statics.findOrCreateCart = async function (userId) {
    let cart = await this.findOne({ user: userId, status: 'active' })
        .populate('items.product');

    if (!cart) {
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

cartSchema.methods.markAsProcessing = function (orderId) {
    if (this.status !== 'active') {
        throw new Error(`Cannot mark cart as processing with status: ${this.status}`);
    }
    this.status = 'processing';
    this.orderId = orderId;
    return this;
};  

cartSchema.methods.revertToActive = function () {
    if (this.status === 'processing') {
        this.status = 'active';
        this.orderId = null;
    }
    return this;
};

cartSchema.methods.canProcessPayment = function () {
    return this.status === 'active' && this.items.length > 0;
};

cartSchema.index({ user: 1, status: 1 }, {
    unique: true,
    partialFilterExpression: { status: 'active' }
});

cartSchema.index({ user: 1, status: 1 });
cartSchema.index({ orderId: 1 });

module.exports = mongoose.model('Cart', cartSchema);
