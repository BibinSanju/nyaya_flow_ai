const express = require("express");
const router = express.Router();
const DocumentController = require("../controllers/documentController");
const ScanController = require("../controllers/scanController");
const { upload } = require("../middleware/uploadMiddleware");
const { authMiddleware, optionalAuth } = require("../middleware/authMiddleware");

// Document management
router.post(
  "/upload",
  authMiddleware,
  upload.single("document"),
  DocumentController.uploadDocument
);
router.get("/", authMiddleware, DocumentController.getDocuments);
router.get("/:id", authMiddleware, DocumentController.getDocumentById);
router.get("/:id/download", optionalAuth, DocumentController.downloadDocument);
router.delete("/:id", authMiddleware, DocumentController.deleteDocument);

// Document scanning & OCR
router.post("/:id/scan", authMiddleware, ScanController.scanDocument);
router.get("/:id/scan-status", authMiddleware, ScanController.getScanStatus);
router.get("/:id/scan-result", authMiddleware, ScanController.getScanResult);

module.exports = router;
