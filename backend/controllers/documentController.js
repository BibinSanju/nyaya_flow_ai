const crypto = require("crypto");
const path = require("path");
const DocumentModel = require("../models/Document");
const StorageService = require("../services/storageService");
const { isStaff } = require("../middleware/authMiddleware");

const formatDoc = (d) => ({
  id: d._id || d.id,
  _id: d._id || d.id,
  filename: d.filename,
  originalName: d.originalName,
  mimeType: d.mimeType,
  size: d.size,
  uploadStatus: d.uploadStatus,
  scanningStatus: d.scanningStatus,
  scanResult: d.scanResult,
  createdAt: d.createdAt,
});

/** Staff and police can see every document; everyone else only their own uploads. */
const canAccess = (user, doc) =>
  isStaff(user) || user?.role === "police" || (doc.userId && String(doc.userId) === String(user?.id));

/** Loads a document and enforces access, sending the error response itself when it fails. */
async function loadAuthorized(req, res) {
  const doc = await DocumentModel.findById(req.params.id);
  if (!doc) {
    res.status(404).json({ success: false, error: "Document not found." });
    return null;
  }
  if (!canAccess(req.user, doc)) {
    res.status(403).json({ success: false, error: "You don't have access to this document." });
    return null;
  }
  return doc;
}

class DocumentController {
  /**
   * POST /api/documents/upload
   */
  static async uploadDocument(req, res, next) {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, error: "Attach a PDF, JPG or PNG file." });
      }

      const file = req.file;
      const ext = path.extname(file.originalname).toLowerCase();
      const safeBase = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 40);
      const filename = `${Date.now()}_${crypto.randomBytes(6).toString("hex")}_${safeBase}${ext}`;
      const storageKey = `${req.user.id}/${filename}`;

      await StorageService.saveFile(storageKey, file.buffer, file.mimetype);

      try {
        const doc = await DocumentModel.create({
          userId: req.user.id,
          petitionId: req.body?.petitionId || null,
          filename,
          originalName: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
          storagePath: storageKey,
          uploadStatus: "completed",
          scanningStatus: "not_scanned",
        });
        return res.status(201).json({ success: true, document: formatDoc(doc) });
      } catch (dbErr) {
        await StorageService.deleteFile(storageKey).catch(() => {});
        throw dbErr;
      }
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/documents
   */
  static async getDocuments(req, res, next) {
    try {
      const query = {};
      if (req.query.petitionId) query.petitionId = req.query.petitionId;
      if (!isStaff(req.user) && req.user.role !== "police") query.userId = req.user.id;

      const docs = await DocumentModel.find(query);
      return res.json({ success: true, count: docs.length, documents: docs.map(formatDoc) });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/documents/:id
   */
  static async getDocumentById(req, res, next) {
    try {
      const doc = await loadAuthorized(req, res);
      if (!doc) return;
      return res.json({ success: true, document: formatDoc(doc) });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/documents/:id/download
   */
  static async downloadDocument(req, res, next) {
    try {
      const doc = await loadAuthorized(req, res);
      if (!doc) return;

      const buffer = await StorageService.readFile(doc.storagePath);
      res.setHeader("Content-Type", doc.mimeType);
      res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(doc.originalName)}"`);
      res.setHeader("Cache-Control", "private, no-store");
      return res.send(buffer);
    } catch (err) {
      next(err);
    }
  }

  /**
   * DELETE /api/documents/:id
   */
  static async deleteDocument(req, res, next) {
    try {
      const doc = await loadAuthorized(req, res);
      if (!doc) return;

      await StorageService.deleteFile(doc.storagePath).catch((e) =>
        console.warn("[Documents] Could not delete stored file:", e.message)
      );
      await DocumentModel.findByIdAndDelete(doc.id);
      return res.json({ success: true });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = DocumentController;
module.exports.loadAuthorized = loadAuthorized;
