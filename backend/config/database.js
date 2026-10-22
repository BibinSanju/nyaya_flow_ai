const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs");

let isMongoConnected = false;

// Ensure data directory exists for local persistence fallback
const dataDir = path.join(__dirname, "..", "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const connectDB = async () => {
  const mongoURI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/nyayaflow";
  
  try {
    // Attempt Mongoose connection with a 4 second timeout
    await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 4000,
      connectTimeoutMS: 4000,
    });
    isMongoConnected = true;
    console.log(`[MongoDB] Connected successfully to: ${mongoURI.replace(/\/\/[^:]+:[^@]+@/, "//***:***@")}`);
  } catch (err) {
    isMongoConnected = false;
    console.warn(`[Database] MongoDB not reachable at ${mongoURI} (${err.message}).`);
    console.log("[Database] Operating in Resilient Local Persistence Mode (JSON/File storage).");
  }
};

const getMongoStatus = () => ({
  connected: isMongoConnected,
  readyState: mongoose.connection.readyState,
  mode: isMongoConnected ? "MongoDB (Mongoose)" : "Local Persistent Storage",
});

module.exports = {
  connectDB,
  getMongoStatus,
  dataDir,
};
