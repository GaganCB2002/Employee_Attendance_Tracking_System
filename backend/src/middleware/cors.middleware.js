const cors = require('cors');
const config = require('../config/env');

// Strict origin allowlist — NEVER wildcard '*' in production, NEVER reflect arbitrary origins
const ALLOWED_ORIGINS = [
  config.corsOrigin,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
].filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. mobile native, curl, postman in dev)
    if (!origin) {
      return callback(null, true);
    }

    if (ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`[SECURITY:CORS_BLOCKED] Request rejected from unauthorized origin: ${origin}`);
      callback(new Error(`CORS policy violation: origin '${origin}' is not authorized.`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-CSRF-Token',
    'X-Requested-With',
    'X-Device-Mock-Check',
    'X-Client-Timestamp',
  ],
  exposedHeaders: ['X-CSRF-Token', 'X-RateLimit-Limit', 'X-RateLimit-Remaining'],
  maxAge: 86400, // 24 hours pre-flight caching
};

module.exports = cors(corsOptions);
