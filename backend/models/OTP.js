const mongoose = require("mongoose");
const { LocalStore } = require("./storageHelper");

const otpSchema = new mongoose.Schema(
  {
    contact: { type: String, required: true, index: true },
    hashedOtp: { type: String, required: true },
    type: { type: String, enum: ["email", "sms"], default: "email" },
    role: { type: String, default: "citizen" },
    attempts: { type: Number, default: 0 },
    maxAttempts: { type: Number, default: 3 },
    used: { type: Boolean, default: false },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
  },
  { timestamps: true }
);

const MongoOtpModel = mongoose.models.OTP || mongoose.model("OTP", otpSchema);
const localOtpStore = new LocalStore("otps");

const OTPModel = {
  isMongoActive() {
    return mongoose.connection.readyState === 1;
  },

  async findLatest(contact) {
    if (this.isMongoActive()) {
      return await MongoOtpModel.findOne({ contact }).sort({ createdAt: -1 });
    }
    const all = await localOtpStore.find({ contact });
    if (!all.length) return null;
    return all.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
  },

  async create(data) {
    if (this.isMongoActive()) {
      return await MongoOtpModel.create(data);
    }
    return await localOtpStore.create(data);
  },

  async findByIdAndUpdate(id, update, options = { new: true }) {
    if (this.isMongoActive()) {
      return await MongoOtpModel.findByIdAndUpdate(id, update, options);
    }
    return await localOtpStore.findByIdAndUpdate(id, update, options);
  },

  async updateMany(query, update) {
    if (this.isMongoActive()) {
      return await MongoOtpModel.updateMany(query, update);
    }
    const items = await localOtpStore.find(query);
    for (const item of items) {
      await localOtpStore.findByIdAndUpdate(item._id || item.id, update);
    }
    return { modifiedCount: items.length };
  },

  async deleteMany(query) {
    if (this.isMongoActive()) {
      return await MongoOtpModel.deleteMany(query);
    }
    return await localOtpStore.deleteMany(query);
  },
};

module.exports = OTPModel;
