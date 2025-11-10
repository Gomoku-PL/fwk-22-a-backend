import mongoose from "mongoose";

const STORAGE_TYPE = process.env.STORAGE_TYPE || "memory"; // 'mongodb' or 'memory'
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/fwk22-consent-db";

let isMongoConnected = false;
let actualStorageType = STORAGE_TYPE; // Track actual storage being used after fallback

export const connectMongoDB = async (retryAttempts = 3, retryDelay = 2000) => {
  // If explicitly set to memory, use it
  if (STORAGE_TYPE === "memory") {
    console.log("📋 Using in-memory storage for consent data (configured)");
    actualStorageType = "memory";
    return false;
  }

  // Try to connect to MongoDB with retry logic
  for (let attempt = 1; attempt <= retryAttempts; attempt++) {
    try {
      await mongoose.connect(MONGODB_URI, {
        serverSelectionTimeoutMS: 5000, // 5 second timeout
        socketTimeoutMS: 45000,
      });
      isMongoConnected = true;
      actualStorageType = "mongodb";
      console.log("🍃 MongoDB connected successfully for consent storage");
      
      // Setup connection event listeners
      mongoose.connection.on("disconnected", () => {
        console.warn("⚠️ MongoDB disconnected - operations will use cached data or fail gracefully");
        isMongoConnected = false;
      });
      
      mongoose.connection.on("reconnected", () => {
        console.log("🔄 MongoDB reconnected successfully");
        isMongoConnected = true;
      });
      
      mongoose.connection.on("error", (err) => {
        console.error("❌ MongoDB error:", err.message);
      });
      
      return true;
    } catch (error) {
      console.error(
        `❌ MongoDB connection attempt ${attempt}/${retryAttempts} failed:`,
        error.message,
      );
      
      if (attempt < retryAttempts) {
        console.log(`⏳ Retrying in ${retryDelay / 1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
  }
  
  // All retry attempts failed - fallback to memory storage
  console.warn("⚠️ All MongoDB connection attempts failed");
  console.log("📋 Falling back to in-memory storage (automatic fallback)");
  console.log("💡 Tip: To use MongoDB, ensure it's running and MONGODB_URI is correct");
  isMongoConnected = false;
  actualStorageType = "memory";
  return false;
};

export const getStorageType = () => actualStorageType; // Returns actual storage in use
export const getConfiguredStorageType = () => STORAGE_TYPE; // Return configured storage
export const isUsingMongoDB = () => isMongoConnected && actualStorageType === "mongodb";
export const getConnectionStatus = () => ({
  configured: STORAGE_TYPE,
  actual: actualStorageType,
  connected: isMongoConnected,
  uri: isMongoConnected ? MONGODB_URI.replace(/\/\/.*@/, '//<credentials>@') : null,
});

// Graceful shutdown
process.on("SIGINT", async () => {
  if (isMongoConnected) {
    await mongoose.connection.close();
    console.log("🍃 MongoDB connection closed.");
  }
  process.exit(0);
});
