const mongoose = require("mongoose");
const { LocalStore } = require("./storageHelper");

const userSchema = new mongoose.Schema(
  {
    email: { type: String, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    fullName: { type: String, required: true, trim: true },
    role: {
      type: String,
      enum: ["citizen", "advocate", "police", "registrar", "judge", "admin"],
      default: "citizen",
    },
    identifier: { type: String, trim: true }, // Aadhaar, Bar ID, Badge, etc.
    verifiedContact: { type: Boolean, default: false },
    lastLogin: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const MongoUserModel = mongoose.models.User || mongoose.model("User", userSchema);
const localUserStore = new LocalStore("users");

const UserModel = {
  isMongoActive() {
    return mongoose.connection.readyState === 1;
  },

  async findOne(query) {
    if (this.isMongoActive()) {
      return await MongoUserModel.findOne(query);
    }
    return await localUserStore.findOne(query);
  },

  async findById(id) {
    if (this.isMongoActive()) {
      return await MongoUserModel.findById(id);
    }
    return await localUserStore.findById(id);
  },

  async create(data) {
    if (this.isMongoActive()) {
      return await MongoUserModel.create(data);
    }
    return await localUserStore.create(data);
  },

  async findByIdAndUpdate(id, update, options) {
    if (this.isMongoActive()) {
      return await MongoUserModel.findByIdAndUpdate(id, update, options);
    }
    return await localUserStore.findByIdAndUpdate(id, update, options);
  },

  async find(query) {
    if (this.isMongoActive()) {
      return await MongoUserModel.find(query);
    }
    return await localUserStore.find(query);
  },
};

module.exports = UserModel;
