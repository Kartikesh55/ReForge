const mongoose = require('mongoose');
const config = require('./index');

const connectDB = async () => {
  const maxRetries = 5;
  let retries = 0;

  while (retries < maxRetries) {
    try {
      await mongoose.connect(config.mongoUri, {
        useNewUrlParser: true,
        useUnifiedTopology: true
      });
      console.log('MongoDB connected successfully');
      break;
    } catch (error) {
      retries++;
      console.error(`MongoDB connection attempt ${retries} failed:`, error.message);
      if (retries === maxRetries) {
        console.error('Max retries reached. Exiting...');
        process.exit(1);
      }
      // Wait for 2 seconds before retrying
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
};

module.exports = connectDB;
