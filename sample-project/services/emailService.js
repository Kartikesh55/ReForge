/**
 * Simulated Email Service
 */

exports.sendOrderConfirmation = async (order, user) => {
  console.log(`[Email Service] Order Confirmation sent to user ID: ${order.customerId} for order ID: ${order._id}`);
  return true;
};

exports.sendOrderStatusUpdate = async (order, user, oldStatus, newStatus) => {
  console.log(`[Email Service] Status update sent for order ${order._id}. Changed from ${oldStatus} to ${newStatus}`);
  return true;
};

exports.sendWelcomeEmail = async (user) => {
  console.log(`[Email Service] Welcome email sent to ${user.email}`);
  return true;
};
