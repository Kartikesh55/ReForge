const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  items: [{
    productId: { type: String, required: true },
    name: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 }
  }],
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'],
    default: 'pending'
  },
  shippingAddress: {
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    zip: { type: String, required: true },
    country: { type: String, required: true }
  },
  paymentId: {
    type: String
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  notes: {
    type: String
  }
}, {
  timestamps: true
});

orderSchema.methods.calculateTotal = function() {
  this.totalAmount = this.items.reduce((total, item) => total + (item.price * item.quantity), 0);
  return this.totalAmount;
};

orderSchema.methods.canCancel = function() {
  return ['pending', 'confirmed', 'processing'].includes(this.status);
};

orderSchema.statics.findByCustomer = function(customerId) {
  return this.find({ customerId });
};

orderSchema.statics.findByStatus = function(status) {
  return this.find({ status });
};

module.exports = mongoose.model('Order', orderSchema);
