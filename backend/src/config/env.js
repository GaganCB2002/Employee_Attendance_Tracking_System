const path = require('path');
const dotenv = require('dotenv');

// Load .env from backend root or parent if needed
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/attendx?schema=public',
  jwtSecret: process.env.JWT_SECRET || 'attendx_super_secret_jwt_key_2026_telemetry_ops',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  sessionTimeoutMinutes: parseInt(process.env.SESSION_TIMEOUT_MINUTES || '15', 10),
  maxFailedAttempts: parseInt(process.env.MAX_FAILED_ATTEMPTS || '3', 10),
  defaultGeofenceRadius: parseFloat(process.env.DEFAULT_GEOFENCE_RADIUS_METERS || '50.0'),
  lateGracePeriodMinutes: parseInt(process.env.LATE_GRACE_PERIOD_MINUTES || '15', 10),
  storageType: process.env.STORAGE_TYPE || 'local',
  uploadDir: process.env.UPLOAD_DIR || path.resolve(__dirname, '../../uploads'),
};

module.exports = config;
