module.exports = {
  port: process.env.PORT || 3000,
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/legacy_orders',
  jwtSecret: process.env.JWT_SECRET || 'fallback_secret_key_change_me_in_prod',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
  paymentApiKey: process.env.PAYMENT_API_KEY || 'dummy_api_key'
};
