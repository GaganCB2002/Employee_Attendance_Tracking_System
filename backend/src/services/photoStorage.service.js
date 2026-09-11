const fs = require('fs');
const path = require('path');
const multer = require('multer');
const config = require('../config/env');

const UPLOADS_ROOT = path.resolve(config.uploadDir);
const CHECKPOINTS_DIR = path.join(UPLOADS_ROOT, 'checkpoints');
const PROFILES_DIR = path.join(UPLOADS_ROOT, 'profiles');

// Ensure directories exist
[UPLOADS_ROOT, CHECKPOINTS_DIR, PROFILES_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Multer storage engine
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const isProfile = req.originalUrl.includes('employee');
    cb(null, isProfile ? PROFILES_DIR : CHECKPOINTS_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `capture-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // up to 25MB for video/clips/photos
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image and video files are supported.'));
    }
  },
});

/**
 * Saves a base64 encoded photo/clip string to local uploads
 * @param {string} base64Data
 * @param {string} folder 'checkpoints' | 'profiles'
 * @returns {string} public relative path
 */
function saveBase64Media(base64Data, folder = 'checkpoints') {
  if (!base64Data || typeof base64Data !== 'string') {
    return null;
  }

  const matches = base64Data.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
  let extension = '.jpg';
  let buffer;

  if (matches && matches.length === 3) {
    const mimeType = matches[1];
    if (mimeType.includes('png')) extension = '.png';
    else if (mimeType.includes('webm')) extension = '.webm';
    else if (mimeType.includes('mp4')) extension = '.mp4';
    buffer = Buffer.from(matches[2], 'base64');
  } else {
    // raw base64 string
    buffer = Buffer.from(base64Data, 'base64');
  }

  const targetDir = folder === 'profiles' ? PROFILES_DIR : CHECKPOINTS_DIR;
  const fileName = `capture-${Date.now()}-${Math.round(Math.random() * 1e6)}${extension}`;
  const filePath = path.join(targetDir, fileName);

  fs.writeFileSync(filePath, buffer);
  return `/uploads/${folder}/${fileName}`;
}

module.exports = {
  upload,
  saveBase64Media,
  UPLOADS_ROOT,
  CHECKPOINTS_DIR,
  PROFILES_DIR,
};
