const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');
const { ALLOWED_FILE_TYPES } = require('../utils/constants');

// Storage configuration
const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    // Determine subdirectory based on purpose
    let subdir = 'other';
    if (req.body?.purpose === 'KYC_DOCUMENT' || req.body?.purpose === 'IDENTITY_PHOTO') {
      subdir = 'kyc';
    } else if (req.body?.purpose === 'AGREEMENT_PDF') {
      subdir = 'agreements';
    } else if (req.body?.purpose === 'PAYMENT_PROOF') {
      subdir = 'proofs';
    }

    const uploadPath = path.resolve(config.upload.dir, subdir);
    cb(null, uploadPath);
  },

  filename: (_req, file, cb) => {
    // Generate unique filename: uuid + original extension
    const ext = path.extname(file.originalname);
    const filename = `${uuidv4()}${ext}`;
    cb(null, filename);
  },
});

// File filter
const fileFilter = (_req, file, cb) => {
  if (ALLOWED_FILE_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(`File type '${file.mimetype}' is not allowed. Accepted: JPEG, PNG, WebP, PDF`),
      false,
    );
  }
};

// Multer instance
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.upload.maxFileSize,
  },
});

module.exports = upload;
