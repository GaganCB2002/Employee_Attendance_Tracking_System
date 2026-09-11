const crypto = require('crypto');
const prisma = require('../config/db');

// In-memory previous block hash for cryptographic chaining
let lastBlockHash = 'GENESIS_ATTENDX_LEDGER_HASH_00000000000000000000000000000000';

/**
 * Calculates SHA-256 hash chaining current log with previous block
 */
function computeChainedHash(previousHash, recordPayload) {
  const serialized = JSON.stringify(recordPayload);
  return crypto.createHash('sha256').update(previousHash + serialized).digest('hex');
}

/**
 * Audit Logger Middleware
 * Hooks into response finish event to record an immutable cryptographic ledger entry.
 */
function auditLoggerMiddleware(req, res, next) {
  const startTime = Date.now();

  // Attach response listener
  res.on('finish', async () => {
    // Only audit state-mutating requests or security/auth routes
    const isMutating = ['POST', 'PUT', 'DELETE'].includes(req.method);
    const isAuthRoute = req.originalUrl.includes('/api/auth');

    if (!isMutating && !isAuthRoute) return;

    try {
      const durationMs = Date.now() - startTime;
      const ipAddress = req.ip || req.connection.remoteAddress || '127.0.0.1';
      const actorId = req.user?.id || 'ANONYMOUS';
      const actorRole = req.user?.role || (req.user ? 'USER' : 'GUEST');

      // Determine action category
      let action = `${req.method}_${req.baseUrl || req.path}`;
      if (req.originalUrl.includes('/login')) action = 'AUTH_LOGIN';
      if (req.originalUrl.includes('/logout')) action = 'AUTH_LOGOUT';
      if (req.originalUrl.includes('/checkpoint')) action = 'CHECKPOINT_SUBMIT';
      if (req.originalUrl.includes('/unlock')) action = 'ACCOUNT_UNLOCKED';
      if (req.originalUrl.includes('/employees') && req.method === 'POST') action = 'EMPLOYEE_ONBOARDED';

      const payload = {
        action,
        status: res.statusCode,
        method: req.method,
        path: req.originalUrl,
        actorId,
        actorRole,
        ipAddress,
        durationMs,
        timestamp: new Date().toISOString(),
      };

      // Cryptographic SHA-256 block chaining
      const currentBlockHash = computeChainedHash(lastBlockHash, payload);
      lastBlockHash = currentBlockHash;

      await prisma.auditLog.create({
        data: {
          action,
          entityType: 'SystemSecurityLedger',
          entityId: req.params?.id || null,
          actorId,
          actorRole,
          ipAddress,
          details: {
            ...payload,
            previousHash: lastBlockHash,
            chainedHash: currentBlockHash,
            photoSha256: req.photoSha256 || null,
          },
        },
      });
    } catch (err) {
      console.error('[AUDIT_LEDGER_ERROR] Failed to record chained audit entry:', err.message);
    }
  });

  next();
}

module.exports = {
  auditLoggerMiddleware,
  computeChainedHash,
};
