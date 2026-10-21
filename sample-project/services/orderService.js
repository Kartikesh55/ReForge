const Order = require('../models/order');
const paymentService = require('./paymentService');
const emailService = require('./emailService');
const orderRepository = require('../repositories/orderRepository');

/**
 * Calculates the total of an order
 */
const calculateOrderTotal = (items) => {
  return items.reduce((total, item) => {
    return total + (item.price * item.quantity);
  }, 0);
};

/**
 * Validates state transitions
 */
const validateStatusTransition = (currentStatus, newStatus) => {
  const transitions = {
    'pending': ['confirmed', 'cancelled'],
    'confirmed': ['processing', 'cancelled'],
    'processing': ['shipped', 'cancelled'],
    'shipped': ['delivered'],
    'delivered': [],
    'cancelled': []
  };

  return transitions[currentStatus] && transitions[currentStatus].includes(newStatus);
};

exports.createOrder = async (orderData, userId) => {
  // 1. Calculate total
  const totalAmount = calculateOrderTotal(orderData.items);
  
  // 2. Create order instance
  const order = new Order({
    ...orderData,
    customerId: userId,
    totalAmount,
    status: 'pending',
    paymentStatus: 'pending'
  });

  // 3. Process payment (simulated)
  if (orderData.paymentMethod) {
    const paymentResult = await paymentService.processPayment(order._id, totalAmount, orderData.paymentMethod);
    order.paymentId = paymentResult.id;
    if (paymentResult.success) {
      order.paymentStatus = 'completed';
      order.status = 'confirmed';
    } else {
      order.paymentStatus = 'failed';
    }
  }

  // 4. Save order
  await order.save();

  // 5. Send notification
  if (order.status === 'confirmed') {
    // emailService.sendOrderConfirmation(order, null); // Stubbed
  }

  return order;
};

exports.getOrderById = async (orderId) => {
  return await orderRepository.findById(orderId);
};

exports.updateOrderStatus = async (orderId, newStatus, user) => {
  const order = await Order.findById(orderId);
  if (!order) throw new Error('Order not found');

  if (!validateStatusTransition(order.status, newStatus)) {
    throw new Error(`Invalid status transition from ${order.status} to ${newStatus}`);
  }

  const oldStatus = order.status;
  order.status = newStatus;
  await order.save();

  // emailService.sendOrderStatusUpdate(order, null, oldStatus, newStatus);

  return order;
};

exports.cancelOrder = async (orderId, user) => {
  const order = await Order.findById(orderId);
  if (!order) throw new Error('Order not found');

  if (user.role === 'customer' && order.customerId.toString() !== user._id.toString()) {
    throw new Error('Not authorized to cancel this order');
  }

  if (!order.canCancel()) {
    throw new Error('Order cannot be cancelled at this stage');
  }

  order.status = 'cancelled';
  
  if (order.paymentStatus === 'completed' && order.paymentId) {
    // Refund payment
    const refund = await paymentService.refundPayment(order.paymentId);
    if (refund.success) {
      order.paymentStatus = 'refunded';
    }
  }

  await order.save();
  return order;
};

exports.getOrdersByCustomer = async (customerId, options) => {
  return await orderRepository.findByCustomerId(customerId, options);
};

// Exporting utility functions for testing
exports.calculateOrderTotal = calculateOrderTotal;
exports.validateStatusTransition = validateStatusTransition;
