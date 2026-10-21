const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

router.get('/me', userController.getCurrentUser);

router.route('/')
  .get(authorize('admin', 'manager'), userController.listUsers);

router.route('/:id')
  .get(userController.getUser)
  .put(userController.updateUser)
  .delete(authorize('admin'), userController.deactivateUser);

module.exports = router;
