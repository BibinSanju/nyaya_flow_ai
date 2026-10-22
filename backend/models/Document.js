const mongoose = require("mongoose");
const { LocalStore } = require("./storageHelper");

const documentSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    filename: { type: String, required: true },
    originalName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    storagePath: { type: String, required: true },
    uploadStatus: {
      type: String,
      enum: ["completed", "failed", "pending"],
      default: "completed",
    },
    scanningStatus: {
      type: String,
      enum: ["not_scanned", "pending", "processing", "completed", "failed"],
      default: "not_scanned",
    },
    scanResult: {
      extractedText: { type: String, default: "" },
      textPreview: { type: String, default: "" },
      wordCount: { type: Number, default: 0 },
      characterCount: { type: Number, default: 0 },
      detectedDocType: { type: String, default: "General Legal Document" },
      confidence: { type: Number, default: 0 },
      pages: { type: Number, default: 1 },
      error: { type: String, default: null },
      completedAt: { type: Date, default: null },
    },
    petitionId: { type: String, default: null },
  },
  { timestamps: true }
);

const MongoDocumentModel = mongoose.models.Document || mongoose.model("Document", documentSchema);
const localDocStore = new LocalStore("documents");

const DocumentModel = {
  isMongoActive() {
    return mongoose.connection.readyState === 1;
  },

  async find(query = {}) {
    if (this.isMongoActive()) {
      return await MongoDocumentModel.find(query).sort({ createdAt: -1 });
    }
    const docs = await localDocStore.find(query);
    return docs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },

  async findById(id) {
    if (this.isMongoActive()) {
      return await MongoDocumentModel.findById(id);
    }
    return await localDocStore.findById(id);
  },

  async findOne(query) {
    if (this.isMongoActive()) {
      return await MongoDocumentModel.findOne(query);
    }
    return await localDocStore.findOne(query);
  },

  async create(data) {
    if (this.isMongoActive()) {
      return await MongoDocumentModel.create(data);
    }
    return await localDocStore.create(data);
  },

  async findByIdAndUpdate(id, update, options = { new: true }) {
    if (this.isMongoActive()) {
      return await MongoDocumentModel.findByIdAndUpdate(id, update, options);
    }
    return await localDocStore.findByIdAndUpdate(id, update, options);
  },

  async findByIdAndDelete(id) {
    if (this.isMongoActive()) {
      return await MongoDocumentModel.findByIdAndDelete(id);
    }
    return await localDocStore.findByIdAndDelete(id);
  },
};

module.exports = DocumentModel;
