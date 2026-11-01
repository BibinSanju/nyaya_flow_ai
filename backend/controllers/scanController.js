const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");
const DocumentModel = require("../models/Document");
const ScanningService = require("../services/scanningService");
const StorageService = require("../services/storageService");
const { loadAuthorized } = require("./documentController");

class ScanController {
  /**
   * POST /api/documents/:id/scan
   */
  static async scanDocument(req, res, next) {
    const { id } = req.params;

    let tempPath = null;
    try {
      const doc = await loadAuthorized(req, res);
      if (!doc) return;

      // Update status to processing
      await DocumentModel.findByIdAndUpdate(id, {
        scanningStatus: "processing",
      });

      // Execute OCR / text extraction
      // The scanner works on files, so copy the stored object to a temp file
      const buffer = await StorageService.readFile(doc.storagePath);
      tempPath = path.join(os.tmpdir(), `nyayaflow_${crypto.randomBytes(8).toString("hex")}${path.extname(doc.filename || "")}`);
      fs.writeFileSync(tempPath, buffer);
      const scanOutput = await ScanningService.scanFile(tempPath, doc.mimeType);

      // Save scan results in database
      const updatedDoc = await DocumentModel.findByIdAndUpdate(
        id,
        {
          scanningStatus: "completed",
          scanResult: {
            extractedText: scanOutput.extractedText,
            textPreview: scanOutput.textPreview,
            wordCount: scanOutput.wordCount,
            characterCount: scanOutput.characterCount,
            detectedDocType: scanOutput.detectedDocType,
            confidence: scanOutput.confidence,
            pages: scanOutput.pages,
            completedAt: scanOutput.completedAt,
            error: null,
          },
        },
        { new: true }
      );

      return res.status(200).json({
        success: true,
        message: "Document scanned and text extracted successfully.",
        documentId: id,
        scanningStatus: "completed",
        scanResult: updatedDoc.scanResult,
      });
    } catch (err) {
      console.error(`[SCAN ERROR for ${id}]`, err.message);

      // Record failure state in database so the client can query scan-status
      await DocumentModel.findByIdAndUpdate(id, {
        scanningStatus: "failed",
        "scanResult.error": err.message,
      });

      return res.status(422).json({
        success: false,
        error: err.message || "Failed to extract text from document.",
        documentId: id,
        scanningStatus: "failed",
      });
    } finally {
      if (tempPath) fs.promises.unlink(tempPath).catch(() => {});
    }
  }

  /**
   * GET /api/documents/:id/scan-status
   */
  static async getScanStatus(req, res, next) {
    try {
      const { id } = req.params;
      const doc = await loadAuthorized(req, res);
      if (!doc) return;

      return res.status(200).json({
        success: true,
        documentId: id,
        scanningStatus: doc.scanningStatus || "not_scanned",
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/documents/:id/scan-result
   */
  static async getScanResult(req, res, next) {
    try {
      const { id } = req.params;
      const doc = await loadAuthorized(req, res);
      if (!doc) return;

      if (doc.scanningStatus !== "completed") {
        return res.status(200).json({
          success: false,
          documentId: id,
          scanningStatus: doc.scanningStatus,
          message:
            doc.scanningStatus === "processing"
              ? "Scanning is currently in progress."
              : doc.scanningStatus === "failed"
              ? `Scanning failed: ${doc.scanResult?.error || "Unknown error"}`
              : "This document has not been scanned yet. Please initiate a scan.",
          scanResult: doc.scanResult || null,
        });
      }

      return res.status(200).json({
        success: true,
        documentId: id,
        scanningStatus: "completed",
        scanResult: doc.scanResult,
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = ScanController;
