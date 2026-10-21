const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validation');

// All order routes require authentication
router.use(authenticate);

router.route('/')
  .get(orderController.listOrders)
  .post(
    validate({ body: ['items', 'shippingAddress'] }), 
    orderController.createOrder
  );

router.route('/:id')
  .get(orderController.getOrder)
  .put(orderController.updateOrder)
  .delete(orderController.cancelOrder);

router.route('/:id/status')
  .put(
    authorize('admin', 'manager'), 
    validate({ body: ['status'] }), 
    orderController.updateOrderStatus
  );

router.get('/customer/:customerId', orderController.getCustomerOrders);

module.exports = router;
