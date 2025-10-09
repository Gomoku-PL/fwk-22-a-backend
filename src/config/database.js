import mongoose from 'mongoose';

const STORAGE_TYPE = process.env.STORAGE_TYPE || 'memory'; // 'mongodb' or 'memory'
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fwk22-consent-db';

let isMongoConnected = false;

export const connectMongoDB = async () => {
  if (STORAGE_TYPE !== 'mongodb') {
    console.log('📋 Using in-memory storage for consent data');
    return false;
  }

  try {
    await mongoose.connect(MONGODB_URI);
    isMongoConnected = true;
    console.log('🍃 MongoDB connected successfully for consent storage');
    return true;
  } catch (error) {
    console.error('❌ MongoDB connection failed, falling back to in-memory storage:', error.message);
    isMongoConnected = false;
    return false;
  }
};

export const getStorageType = () => STORAGE_TYPE;
export const isUsingMongoDB = () => isMongoConnected && STORAGE_TYPE === 'mongodb';

// Graceful shutdown
process.on('SIGINT', async () => {
  if (isMongoConnected) {
    await mongoose.connection.close();
    console.log('🍃 MongoDB connection closed.');
  }
  process.exit(0);
});