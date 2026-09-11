const http = require('http');
const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');
const { Server } = require('socket.io');

const config = require('./config/env');
const prisma = require('./config/db');
const { setupLiveEventsSocket } = require('./sockets/liveEvents.socket');

// Hardened Middleware Stack
const securityMiddleware = require('./middleware/security.middleware');
const corsMiddleware = require('./middleware/cors.middleware');
const { globalRateLimiter } = require('./middleware/rateLimiter.middleware');
const sanitizeMiddleware = require('./middleware/sanitize.middleware');
const csrfMiddleware = require('./middleware/csrfMiddleware');
const { auditLoggerMiddleware } = require('./middleware/auditLogger.middleware');
const errorHandlerMiddleware = require('./middleware/errorHandler.middleware');

// Routes
const authRoutes = require('./routes/auth.routes');
const employeeRoutes = require('./routes/employee.routes');
const attendanceRoutes = require('./routes/attendance.routes');
const geofenceRoutes = require('./routes/geofence.routes');
const adminRoutes = require('./routes/admin.routes');
const liveTvRoutes = require('./routes/liveTv.routes');
const organizationRoutes = require('./routes/organization.routes');
const settingsRoutes = require('./routes/settings.routes');
const reportsRoutes = require('./routes/reports.routes');

const app = express();
const server = http.createServer(app);

// Setup Socket.IO with hardened CORS
const io = new Server(server, {
  cors: {
    origin: [config.corsOrigin, 'http://localhost:5173', 'http://127.0.0.1:5173'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  },
});

setupLiveEventsSocket(io);

// ============================================================================
// MIDDLEWARE PIPELINE (Exact Specified Hardening Order)
// 1. Helmet + Strict Security Headers & Policies
// ============================================================================
app.use(securityMiddleware);

// 2. Strict Origin Allowlist (No Wildcards, No Arbitrary Origin Reflection)
app.use(corsMiddleware);

// 3. Global IP Rate Limiter (100 req/min baseline)
app.use(globalRateLimiter);

// 4. Size-Limited Body Parsers (2MB cap for JSON, dedicated limit for uploads)
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(cookieParser());

// 5. Input Sanitization (Recursively strips XSS tags, NoSQL operators, SQLi comments)
app.use(sanitizeMiddleware);

// 6. Anti-CSRF Protection for Cookie Sessions (Double-Submit Validation)
app.use(csrfMiddleware);

// 7. Cryptographic Immutable Chained Audit Logger (SHA-256 Block Chaining)
app.use(auditLoggerMiddleware);

// Static uploads serving
app.use('/uploads', express.static(path.resolve(config.uploadDir)));

// System Telemetry & Health Check
app.get('/api/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return res.json({
      status: 'ONLINE',
      system: 'AttendX Aero-Ops Telemetry API (Hardened)',
      version: '2.5.0',
      database: 'CONNECTED',
      securityProfile: 'MAXIMUM_HARDENED',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return res.status(500).json({
      status: 'DEGRADED',
      database: 'DISCONNECTED',
      error: 'Database connectivity degraded.',
    });
  }
});

// ============================================================================
// API ROUTES (with per-route validate, auth, role, lockout & deviceCheck)
// ============================================================================
app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/geofences', geofenceRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/live-tv', liveTvRoutes);
app.use('/api/organization', organizationRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/reports', reportsRoutes);

// ============================================================================
// CENTRALIZED ERROR HANDLER (No Stack Leaks, Safe Incident IDs)
// ============================================================================
app.use(errorHandlerMiddleware);

// Start Server
server.listen(config.port, () => {
  console.log(`====================================================`);
  console.log(` AttendX Telemetry Ops Server running on port ${config.port}`);
  console.log(` Environment: ${config.nodeEnv}`);
  console.log(` Security Pipeline: ACTIVE (Helmet, CORS, Limiter, Sanitize, Chained Audit)`);
  console.log(` WebSocket Stream: /socket.io ready`);
  console.log(`====================================================`);
});

module.exports = { app, server, io };
