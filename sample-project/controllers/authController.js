const User = require('../models/user');
const jwt = require('jsonwebtoken');
const config = require('../config');

const generateToken = (id) => {
  return jwt.sign({ id }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn
  });
};

exports.register = async (req, res, next) => {
  try {
    const { email, password, firstName, lastName, role } = req.body;

    // Check if user exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ error: 'User already exists' });
    }

    user = await User.create({
      email,
      password,
      firstName,
      lastName,
      role: role || 'customer'
    });

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      token,
      user
    });
  } catch (error) {
    next(error);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!user.isActive) {
      return res.status(401).json({ error: 'Account is deactivated' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    user.lastLogin = Date.now();
    await user.save({ validateBeforeSave: false });

    const token = generateToken(user._id);

    // Convert to object and remove password for response
    const userResponse = user.toObject();
    delete userResponse.password;

    res.status(200).json({
      success: true,
      token,
      user: userResponse
    });
  } catch (error) {
    next(error);
  }
};

exports.logout = (req, res) => {
  // In a stateless JWT approach, logout is handled client-side by deleting the token.
  // We can just return success here.
  res.status(200).json({ success: true, message: 'Logged out successfully' });
};

exports.refreshToken = (req, res) => {
  // Stub for token refresh logic
  res.status(200).json({ success: true, message: 'Token refreshed' });
};
