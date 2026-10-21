const User = require('../models/user');

class UserRepository {
  async findAll() {
    return await User.find();
  }

  async findById(id) {
    return await User.findById(id);
  }

  async findByEmail(email) {
    return await User.findOne({ email });
  }

  async create(data) {
    return await User.create(data);
  }

  async update(id, data) {
    return await User.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  }

  async deactivate(id) {
    return await User.findByIdAndUpdate(id, { isActive: false }, { new: true });
  }
}

module.exports = new UserRepository();
