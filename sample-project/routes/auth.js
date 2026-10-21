const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const validate = require('../middleware/validation');

router.post('/register', validate({ body: ['email', 'password', 'firstName', 'lastName'] }), authController.register);
router.post('/login', validate({ body: ['email', 'password'] }), authController.login);
router.post('/logout', authController.logout);
router.post('/refresh', authController.refreshToken);

module.exports = router;
