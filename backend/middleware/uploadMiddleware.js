const multer = require("multer");
const path = require("path");

const allowedMimeTypes = ["application/pdf", "image/jpeg", "image/jpg", "image/png"];
const allowedExtensions = [".pdf", ".jpeg", ".jpg", ".png"];

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!allowedExtensions.includes(ext) || !allowedMimeTypes.includes(file.mimetype)) {
    return cb(new Error("Invalid file type. Only PDF, JPG and PNG files are supported."), false);
  }
  cb(null, true);
};

// Files are held in memory, then written to storage by the controller
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024, files: 1 },
  fileFilter,
});

module.exports = { upload };
