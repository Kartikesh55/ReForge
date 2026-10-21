/**
 * Simulated Payment Service
 */

exports.processPayment = async (orderId, amount, paymentMethod) => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));

  if (!this.validatePaymentMethod(paymentMethod)) {
    return { success: false, error: 'Invalid payment method' };
  }

  // Simulate random failure (10% chance)
  if (Math.random() < 0.1) {
    return { success: false, error: 'Payment declined by gateway' };
  }

  return {
    success: true,
    id: `pay_${Math.random().toString(36).substr(2, 9)}`,
    status: 'completed',
    amount
  };
};

exports.refundPayment = async (paymentId) => {
  await new Promise(resolve => setTimeout(resolve, 500));
  
  if (!paymentId) {
    return { success: false, error: 'No payment ID provided' };
  }

  return {
    success: true,
    id: `ref_${Math.random().toString(36).substr(2, 9)}`,
    status: 'refunded',
    originalPaymentId: paymentId
  };
};

exports.getPaymentStatus = async (paymentId) => {
  // Stub
  return { status: 'completed' };
};

exports.validatePaymentMethod = (method) => {
  const validMethods = ['credit_card', 'paypal', 'bank_transfer'];
  return validMethods.includes(method);
};
