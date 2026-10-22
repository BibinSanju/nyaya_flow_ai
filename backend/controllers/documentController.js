const path = require("path");
const fs = require("fs");
const DocumentModel = require("../models/Document");

class DocumentController {
  /**
   * POST /api/documents/upload
   */
  static async uploadDocument(req, res, next) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: "No file was uploaded. Please attach a valid PDF, JPG, or PNG document.",
        });
      }

      const file = req.file;
      const userId = req.user?.id || req.body?.userId || "user_litigant_001";
      const petitionId = req.body?.petitionId || null;

      // Save metadata to database
      const doc = await DocumentModel.create({
        userId,
        filename: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        storagePath: file.path,
        uploadStatus: "completed",
        scanningStatus: "not_scanned",
        petitionId,
      });

      const docId = doc._id || doc.id;

      return res.status(201).json({
        success: true,
        message: "Document uploaded and stored successfully.",
        document: {
          id: docId,
          _id: docId,
          filename: doc.filename,
          originalName: doc.originalName,
          mimeType: doc.mimeType,
          size: doc.size,
          uploadStatus: doc.uploadStatus,
          scanningStatus: doc.scanningStatus,
          createdAt: doc.createdAt,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/documents
   */
  static async getDocuments(req, res, next) {
    try {
      const { petitionId, userId } = req.query;
      const query = {};

      if (petitionId) query.petitionId = petitionId;
      if (userId) query.userId = userId;

      const docs = await DocumentModel.find(query);

      const formatted = docs.map((d) => ({
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
      }));

      return res.status(200).json({
        success: true,
        count: formatted.length,
        documents: formatted,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/documents/:id
   */
  static async getDocumentById(req, res, next) {
    try {
      const { id } = req.params;
      const doc = await DocumentModel.findById(id);

      if (!doc) {
        return res.status(404).json({
          success: false,
          error: `Document with ID "${id}" was not found.`,
        });
      }

      return res.status(200).json({
        success: true,
        document: {
          id: doc._id || doc.id,
          _id: doc._id || doc.id,
          filename: doc.filename,
          originalName: doc.originalName,
          mimeType: doc.mimeType,
          size: doc.size,
          uploadStatus: doc.uploadStatus,
          scanningStatus: doc.scanningStatus,
          scanResult: doc.scanResult,
          createdAt: doc.createdAt,
          updatedAt: doc.updatedAt,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/documents/:id/download
   */
  static async downloadDocument(req, res, next) {
    try {
      const { id } = req.params;
      const doc = await DocumentModel.findById(id);

      if (!doc) {
        return res.status(404).json({
          success: false,
          error: "Document not found.",
        });
      }

      if (!fs.existsSync(doc.storagePath)) {
        return res.status(404).json({
          success: false,
          error: "Physical file was not found on the server storage disk.",
        });
      }

      res.setHeader("Content-Type", doc.mimeType);
      res.setHeader(
        "Content-Disposition",
        `inline; filename="${encodeURIComponent(doc.originalName)}"`
      );
      return res.sendFile(path.resolve(doc.storagePath));
    } catch (err) {
      next(err);
    }
  }

  /**
   * DELETE /api/documents/:id
   */
  static async deleteDocument(req, res, next) {
    try {
      const { id } = req.params;
      const doc = await DocumentModel.findById(id);

      if (!doc) {
        return res.status(404).json({
          success: false,
          error: "Document not found.",
        });
      }

      // Remove physical file
      if (fs.existsSync(doc.storagePath)) {
        try {
          fs.unlinkSync(doc.storagePath);
        } catch (unlinkErr) {
          console.warn("[DELETE DOCUMENT] Warning removing file:", unlinkErr.message);
        }
      }

      // Remove database entry
      await DocumentModel.findByIdAndDelete(id);

      return res.status(200).json({
        success: true,
        message: "Document deleted successfully.",
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = DocumentController;
