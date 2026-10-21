const Order = require('../models/order');

class OrderRepository {
  async findAll(filters = {}, options = {}) {
    const page = options.page || 1;
    const limit = options.limit || 10;
    const skip = (page - 1) * limit;

    return await Order.find(filters)
      .skip(skip)
      .limit(limit)
      .sort(options.sort || '-createdAt')
      .populate('customerId', 'firstName lastName email');
  }

  async findById(id) {
    return await Order.findById(id).populate('customerId', 'firstName lastName email');
  }

  async create(data) {
    const order = new Order(data);
    return await order.save();
  }

  async update(id, data) {
    return await Order.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  }

  async delete(id) {
    return await Order.findByIdAndDelete(id);
  }

  async findByCustomerId(customerId, options = {}) {
    return this.findAll({ customerId }, options);
  }

  async findByStatus(status) {
    return await Order.find({ status });
  }

  async countByStatus() {
    return await Order.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
  }
}

module.exports = new OrderRepository();
