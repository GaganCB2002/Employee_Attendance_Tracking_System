const crypto = require('crypto');

/**
 * Centralized Hardened Error Handler
 * Prevents stack trace, database internals, and file path leakage to clients.
 */
function errorHandlerMiddleware(err, req, res, next) {
  const incidentId = `INC-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

  // Log full stack and context internally on server
  console.error(`[ERROR_INCIDENT:${incidentId}] ${req.method} ${req.originalUrl}`);
  console.error(err);

  // Default error properties
  let statusCode = err.status || err.statusCode || 500;
  let clientMessage = 'An unexpected internal error occurred. Please contact security operations.';

  // Handle known safe operational error types
  if (err.name === 'ValidationError' || err.message?.includes('Validation failed')) {
    statusCode = 400;
    clientMessage = err.message || 'Request input validation failed.';
  } else if (err.name === 'UnauthorizedError' || err.name === 'JsonWebTokenError') {
    statusCode = 401;
    clientMessage = 'Authentication failed or session expired.';
  } else if (err.code === 'EBADCSRFTOKEN') {
    statusCode = 403;
    clientMessage = 'Invalid or tampered CSRF security token.';
  } else if (err.type === 'entity.too.large' || err.message?.includes('too large')) {
    statusCode = 413;
    clientMessage = 'Uploaded payload exceeds allowable security limits.';
  } else if (err.message?.includes('CORS policy violation')) {
    statusCode = 403;
    clientMessage = 'Access denied by CORS policy.';
  }

  // Response payload (Safe, no stack traces leaked)
  res.status(statusCode).json({
    success: false,
    error: clientMessage,
    incidentId,
    timestamp: new Date().toISOString(),
  });
}

module.exports = errorHandlerMiddleware;
