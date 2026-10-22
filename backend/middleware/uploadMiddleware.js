const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

// Ensure uploads folder exists
const uploadsDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Storage configuration with sanitized server-side filenames
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const randomSuffix = crypto.randomBytes(8).toString("hex");
    const ext = path.extname(file.originalname).toLowerCase();
    const safeBase = path
      .basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .slice(0, 30);
    cb(null, `doc_${Date.now()}_${randomSuffix}_${safeBase}${ext}`);
  },
});

// Allowed file types
const allowedMimeTypes = [
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
];

const allowedExtensions = [".pdf", ".jpeg", ".jpg", ".png"];

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (!allowedExtensions.includes(ext) || !allowedMimeTypes.includes(file.mimetype)) {
    return cb(
      new Error(
        `Invalid file type "${file.mimetype}". Only PDF, JPG, JPEG, and PNG files are supported.`
      ),
      false
    );
  }
  cb(null, true);
};

// 15MB file size limit
const upload = multer({
  storage,
  limits: {
    fileSize: 15 * 1024 * 1024, // 15 Megabytes
    files: 1,
  },
  fileFilter,
});

module.exports = {
  upload,
  uploadsDir,
};
