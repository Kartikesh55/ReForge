const paymentService = require('../services/paymentService');

describe('Payment Service', () => {
  it('should validate payment methods', () => {
    expect(paymentService.validatePaymentMethod('credit_card')).toBe(true);
    expect(paymentService.validatePaymentMethod('bitcoin')).toBe(false);
  });
});
