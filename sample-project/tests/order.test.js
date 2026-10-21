const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const Order = require('../models/order');
const User = require('../models/user');
const jwt = require('jsonwebtoken');
const config = require('../config');

// Mock dependencies
jest.mock('../services/paymentService');

let token;
let user;

beforeAll(async () => {
  // Mock DB setup or connect to test DB
  user = new User({ _id: new mongoose.Types.ObjectId(), email: 'test@test.com', role: 'customer' });
  token = jwt.sign({ id: user._id }, config.jwtSecret);
});

describe('Order Service & Endpoints', () => {
  it('should calculate order total correctly', () => {
    const orderService = require('../services/orderService');
    const items = [
      { price: 10, quantity: 2 },
      { price: 5, quantity: 4 }
    ];
    const total = orderService.calculateOrderTotal(items);
    expect(total).toBe(40);
  });

  it('should validate status transitions', () => {
    const orderService = require('../services/orderService');
    expect(orderService.validateStatusTransition('pending', 'confirmed')).toBe(true);
    expect(orderService.validateStatusTransition('pending', 'shipped')).toBe(false);
  });
});
