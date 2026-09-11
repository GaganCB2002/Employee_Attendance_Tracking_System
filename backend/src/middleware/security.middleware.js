const helmet = require('helmet');

const securityMiddleware = [
  // Core helmet suite
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'blob:', 'http://localhost:4000', 'http://localhost:5173'],
        mediaSrc: ["'self'", 'blob:', 'http://localhost:4000', 'http://localhost:5173'],
        connectSrc: ["'self'", 'ws://localhost:4000', 'wss://localhost:4000', 'http://localhost:4000', 'http://localhost:5173'],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
      },
    },
    frameguard: { action: 'deny' }, // X-Frame-Options: DENY
    noSniff: true,                  // X-Content-Type-Options: nosniff
    referrerPolicy: { policy: 'no-referrer' },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allows uploads/photos to load on client
  }),

  // Locked-down Permissions-Policy (Feature Policy)
  // Only camera and geolocation permitted, and only for same-origin
  (req, res, next) => {
    res.setHeader(
      'Permissions-Policy',
      'camera=(self), geolocation=(self), microphone=(), payment=(), usb=(), accelerometer=(), gyroscope=(), magnetometer=()'
    );

    // Enforce HTTPS in production via HSTS and upgrade
    if (process.env.NODE_ENV === 'production' && req.headers['x-forwarded-proto'] !== 'https') {
      return res.redirect(301, `https://${req.headers.host}${req.url}`);
    }

    next();
  },
];

module.exports = securityMiddleware;
