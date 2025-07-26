
const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        min: 1
    },
    price: {
        type: Number,
        required: true
    },
    totalPrice: {
        type: Number,
        required: true
    },
    variant: {
        type: String,
        default: null
    }
}, {
    timestamps: true
});

const orderSchema = new mongoose.Schema({
    orderNumber: {
        type: String,
        unique: true,
        default: function() {
            return 'ORD-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9).toUpperCase();
        }
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    items: [orderItemSchema],
    subtotal: {
        type: Number,
        required: true
    },
    shippingCost: {
        type: Number,
        default: 0
    },
    tax: {
        type: Number,
        default: 0
    },
    totalAmount: {
        type: Number,
        required: true
    },
    orderStatus: {
        type: String,
        enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
        default: 'pending'
    },
    paymentStatus: {
        type: String,
        enum: ['pending', 'processing', 'completed', 'failed', 'refunded'],
        default: 'pending'
    },
    paymentIntentId: {
        type: String,
        required: false, // Make this optional
        default: null
    },
    shippingAddress: {
        street: String,
        city: String,
        state: String,
        zipCode: String,
        country: String
    },
    trackingNumber: {
        type: String,
        default: null
    },
    notes: {
        type: String,
        default: null
    }
}, {
    timestamps: true
});

// Generate order number before saving if not provided
orderSchema.pre('save', function(next) {
    if (!this.orderNumber) {
        this.orderNumber = 'ORD-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9).toUpperCase();
    }
    next();
});

// Method to update payment intent
orderSchema.methods.setPaymentIntent = function(paymentIntentId) {
    this.paymentIntentId = paymentIntentId;
    this.paymentStatus = 'processing';
    return this;
};

// Method to mark payment as completed
orderSchema.methods.markPaymentCompleted = function() {
    this.paymentStatus = 'completed';
    this.orderStatus = 'processing';
    return this;
};

// Method to mark payment as failed
orderSchema.methods.markPaymentFailed = function() {
    this.paymentStatus = 'failed';
    this.orderStatus = 'cancelled';
    return this;
};

module.exports = mongoose.model('Order', orderSchema);