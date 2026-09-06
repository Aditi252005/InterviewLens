const fs = require("fs");
const path = require("path");
const multer = require("multer");
const { AppError } = require("./errorHandler");

const TMP_DIR = path.join(__dirname, "..", "..", "tmp_uploads");
if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });

const MAX_RESUME_SIZE_MB = Number(process.env.MAX_RESUME_SIZE_MB || 5);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, TMP_DIR),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}.pdf`;
    cb(null, unique);
  },
});

function fileFilter(_req, file, cb) {
  // Reject anything that doesn't at least claim to be a PDF up front.
  // We double-check the actual file contents (magic bytes) after upload,
  // since filename/MIME type alone can be spoofed.
  const isPdfMime = file.mimetype === "application/pdf";
  const isPdfExt = path.extname(file.originalname).toLowerCase() === ".pdf";
  if (!isPdfMime || !isPdfExt) {
    return cb(new AppError("Only PDF resumes are supported.", 400, "INVALID_FILE_TYPE"));
  }
  cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_RESUME_SIZE_MB * 1024 * 1024 },
});

// Verifies the uploaded file actually starts with the PDF magic bytes
// ("%PDF-"). Deletes the temp file and throws if it doesn't look like a
// real PDF. Call this after multer has written the file to disk.
function assertRealPdf(filePath) {
  const fd = fs.openSync(filePath, "r");
  const buffer = Buffer.alloc(5);
  fs.readSync(fd, buffer, 0, 5, 0);
  fs.closeSync(fd);

  if (buffer.toString("utf8") !== "%PDF-") {
    safeDelete(filePath);
    throw new AppError("The uploaded file is not a valid PDF.", 400, "INVALID_PDF_CONTENT");
  }
}

function safeDelete(filePath) {
  fs.unlink(filePath, (err) => {
    if (err && err.code !== "ENOENT") {
      console.error("Failed to delete temporary resume file:", err.message);
    }
  });
}

module.exports = { upload, assertRealPdf, safeDelete, TMP_DIR };
