const crypto = require('crypto');

/**
 * CSRF Protection Middleware
 * Generates and validates CSRF anti-forgery tokens for mutating requests.
 * Safe methods (GET, HEAD, OPTIONS) and credential authentication endpoints are exempt.
 */
function csrfMiddleware(req, res, next) {
  // 1. Safe HTTP methods bypass CSRF check and issue anti-forgery cookie
  const SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS'];
  if (SAFE_METHODS.includes(req.method)) {
    if (!req.cookies?.['attendx_csrf']) {
      const token = crypto.randomBytes(32).toString('hex');
      res.cookie('attendx_csrf', token, {
        httpOnly: false, // Accessible by frontend client to send in X-CSRF-Token header
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'Strict',
      });
      res.setHeader('X-CSRF-Token', token);
    }
    return next();
  }

  // 2. Direct Authorization Bearer tokens (standard API clients / mobile app / JWT)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return next();
  }

  // 3. Exempt initial login and token refresh (protected by CORS + Rate Limiter + Lockout)
  const isAuthInitialRoute =
    req.path === '/api/auth/login' ||
    req.path === '/login' ||
    req.originalUrl?.includes('/api/auth/login') ||
    req.originalUrl?.includes('/api/auth/refresh');

  if (isAuthInitialRoute) {
    return next();
  }

  // 4. For requests that have a session cookie, enforce double-submit CSRF verification
  if (req.cookies?.['attendx_csrf']) {
    const clientToken = req.headers['x-csrf-token'] || req.body?._csrf;
    const cookieToken = req.cookies['attendx_csrf'];

    if (!clientToken || clientToken !== cookieToken) {
      console.warn('[SECURITY:CSRF_REJECTED] Missing or mismatched anti-forgery token.');
      return res.status(403).json({
        success: false,
        error: 'Invalid or missing CSRF security token.',
      });
    }
  }

  next();
}

module.exports = csrfMiddleware;
