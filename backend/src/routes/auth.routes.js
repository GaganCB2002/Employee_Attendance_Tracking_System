const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/auth.controller');
const authMiddleware = require('../middleware/authMiddleware');
const { checkLockoutStatus } = require('../middleware/lockoutMiddleware');
const { loginRateLimiter } = require('../middleware/rateLimiter.middleware');
const { validateSchema, SCHEMAS } = require('../middleware/validate.middleware');

// Public auth routes with strict schema validation & rate limiting
router.post(
  '/login',
  loginRateLimiter,
  validateSchema(SCHEMAS.login),
  checkLockoutStatus,
  AuthController.login
);

// Rotating refresh token endpoint
router.post('/refresh', AuthController.refresh);

// Explicit logout (server-side token revocation)
router.post('/logout', AuthController.logout);

// Protected auth routes
router.get('/me', authMiddleware, AuthController.getMe);
router.post('/lock-session', authMiddleware, AuthController.lockSession);

module.exports = router;
