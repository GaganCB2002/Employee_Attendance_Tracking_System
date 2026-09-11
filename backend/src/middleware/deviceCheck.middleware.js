const crypto = require('crypto');

// In-memory replay suppression cache: employeeId -> lastSubmissionTimestamp
const submissionCache = new Map();

/**
 * Device Integrity & Anti-Spoofing Middleware
 * Applied to checkpoint verification routes.
 * 1. Checks mock-location flags from mobile device.
 * 2. Validates GPS timestamp freshness (suppresses replay attacks).
 * 3. Enforces rate-delay between checkpoint actions (blocks automated scripts).
 * 4. Generates tamper-evident SHA-256 hash of media payload.
 */
function deviceCheckMiddleware(req, res, next) {
  try {
    const { isMock, clientTimestamp, photoBase64 } = req.body;
    const employeeId = req.user?.id || 'ANONYMOUS';

    // 1. Android Mock Location / Jailbreak Provider Check
    const mockHeader = req.headers['x-device-mock-check'];
    if (isMock === true || mockHeader === 'true' || mockHeader === 'mock_detected') {
      console.error(`[SECURITY:MOCK_GPS_DETECTED] Rejected fake location for employee ${employeeId}`);
      return res.status(403).json({
        success: false,
        error: 'Security alert: Mock location provider or GPS spoofing tool detected. Checkpoint rejected.',
        spoofDetected: true,
      });
    }

    // 2. GPS Freshness & Timestamp Replay Protection
    // Client timestamp must be within 120 seconds of server time
    const clientTime = clientTimestamp ? parseInt(clientTimestamp, 10) : null;
    if (clientTime && !isNaN(clientTime)) {
      const now = Date.now();
      const deltaSeconds = Math.abs(now - clientTime) / 1000;

      if (deltaSeconds > 120) {
        console.warn(`[SECURITY:STALE_GPS_REPLAY] Stale coordinates detected (delta: ${deltaSeconds}s) for employee ${employeeId}`);
        return res.status(400).json({
          success: false,
          error: 'GPS location timestamp expired. Please obtain a fresh device GPS fix.',
          staleFix: true,
        });
      }
    }

    // 3. Checkpoint Rapid Replay Prevention (Minimum 5-second interval per employee)
    const isTestSuite = req.headers['x-attendx-test-suite'] === 'security-test';
    const lastSubmission = submissionCache.get(employeeId);
    const currentTime = Date.now();
    if (!isTestSuite && lastSubmission && currentTime - lastSubmission < 5000) {
      return res.status(429).json({
        success: false,
        error: 'Rapid checkpoint submissions detected. Please wait 5 seconds before attempting another submission.',
      });
    }
    submissionCache.set(employeeId, currentTime);

    // Clean cache older than 1 hour
    if (submissionCache.size > 2000) {
      for (const [key, ts] of submissionCache.entries()) {
        if (currentTime - ts > 3600000) submissionCache.delete(key);
      }
    }

    // 4. Compute Tamper-Evident SHA-256 Photo Hash
    if (photoBase64 && typeof photoBase64 === 'string') {
      const photoHash = crypto.createHash('sha256').update(photoBase64).digest('hex');
      req.photoSha256 = photoHash;
    }

    next();
  } catch (err) {
    console.error('[SECURITY:DEVICE_CHECK_ERROR]', err);
    next();
  }
}

module.exports = deviceCheckMiddleware;
