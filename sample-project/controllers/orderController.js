const orderService = require('../services/orderService');
const Order = require('../models/order');

exports.listOrders = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    
    let query = {};
    if (req.query.status) {
      query.status = req.query.status;
    }
    
    // Only admins/managers can see all orders, customers see their own
    if (req.user.role === 'customer') {
      query.customerId = req.user._id;
    }

    const total = await Order.countDocuments(query);
    const orders = await Order.find(query)
      .populate('customerId', 'firstName lastName email')
      .skip(startIndex)
      .limit(limit)
      .sort('-createdAt');

    res.status(200).json({
      success: true,
      count: orders.length,
      pagination: {
        page,
        limit,
        total
      },
      data: orders
    });
  } catch (error) {
    next(error);
  }
};

exports.getOrder = async (req, res, next) => {
  try {
    const order = await orderService.getOrderById(req.params.id);
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Check ownership
    if (req.user.role === 'customer' && order.customerId._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Not authorized to view this order' });
    }

    res.status(200).json({
      success: true,
      data: order
    });
  } catch (error) {
    next(error);
  }
};

exports.createOrder = async (req, res, next) => {
  try {
    const order = await orderService.createOrder(req.body, req.user._id);
    
    res.status(201).json({
      success: true,
      data: order
    });
  } catch (error) {
    next(error);
  }
};

exports.updateOrder = async (req, res, next) => {
  try {
    // Only allow updating notes and shipping address via this endpoint
    const { notes, shippingAddress } = req.body;
    let order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    if (req.user.role === 'customer' && order.customerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Not authorized to update this order' });
    }

    if (notes) order.notes = notes;
    if (shippingAddress) order.shippingAddress = shippingAddress;

    await order.save();

    res.status(200).json({
      success: true,
      data: order
    });
  } catch (error) {
    next(error);
  }
};

exports.updateOrderStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const order = await orderService.updateOrderStatus(req.params.id, status, req.user);
    
    res.status(200).json({
      success: true,
      data: order
    });
  } catch (error) {
    next(error);
  }
};

exports.cancelOrder = async (req, res, next) => {
  try {
    const order = await orderService.cancelOrder(req.params.id, req.user);
    
    res.status(200).json({
      success: true,
      data: order,
      message: 'Order cancelled successfully'
    });
  } catch (error) {
    next(error);
  }
};

exports.getCustomerOrders = async (req, res, next) => {
  try {
    // Authorization check
    if (req.user.role === 'customer' && req.params.customerId !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Not authorized to view these orders' });
    }

    const options = {
      page: parseInt(req.query.page, 10) || 1,
      limit: parseInt(req.query.limit, 10) || 10
    };

    const orders = await orderService.getOrdersByCustomer(req.params.customerId, options);
    
    res.status(200).json({
      success: true,
      count: orders.length,
      data: orders
    });
  } catch (error) {
    next(error);
  }
};
