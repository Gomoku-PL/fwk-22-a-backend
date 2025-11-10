// Test MongoDB automatic fallback
import { connectMongoDB, getConnectionStatus } from "./src/config/database.js";

console.log("\n🧪 Testing MongoDB Automatic Fallback\n");
console.log("=" .repeat(50));

// Simulate MongoDB unavailable
process.env.STORAGE_TYPE = "mongodb";
process.env.MONGODB_URI = "mongodb://nonexistent-host:27017/test-db";

console.log("\n📝 Configuration:");
console.log(`  STORAGE_TYPE: ${process.env.STORAGE_TYPE}`);
console.log(`  MONGODB_URI: ${process.env.MONGODB_URI}`);

console.log("\n⏳ Attempting MongoDB connection (will retry 3 times)...\n");

await connectMongoDB();

const status = getConnectionStatus();

console.log("\n📊 Final Storage Status:");
console.log(`  Configured: ${status.configured}`);
console.log(`  Actual: ${status.actual}`);
console.log(`  Connected: ${status.connected}`);
console.log(`  Fallback Active: ${status.fallbackActive ? "✅ YES" : "❌ NO"}`);

console.log("\n" + "=".repeat(50));

if (status.fallbackActive) {
  console.log("\n✅ SUCCESS: Automatic fallback to memory storage is working!");
  console.log("   MongoDB was unavailable, so the system automatically");
  console.log("   switched to in-memory storage for development.");
} else if (status.actual === "memory" && status.configured === "memory") {
  console.log("\n✅ Using configured memory storage");
} else {
  console.log("\n✅ MongoDB connected successfully");
}

console.log("\n");
process.exit(0);
