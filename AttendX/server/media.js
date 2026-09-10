'use strict';
// Multer in-memory storage for photo/video captures (then AES-GCM encrypted to disk).
const multer = require('multer');

module.exports = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 30 * 1024 * 1024 }, // 30 MB cap for short clips
  fileFilter: (req, file, cb) => {
    const ok = /^(image\/(jpeg|png|webp)|video\/(webm|mp4))$/i.test(file.mimetype);
    cb(ok ? null : new Error('Unsupported media type'), ok);
  },
});
