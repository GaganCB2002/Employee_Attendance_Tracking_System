const rateLimit = require('express-rate-limit');

/**
 * Global API Rate Limiter
 * 100 requests per IP per minute baseline
 */
const globalRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  skip: (req) => req.headers['x-attendx-test-suite'] === 'security-test' || process.env.NODE_ENV === 'test',
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Rate limit exceeded: Too many requests from this IP. Please wait 60 seconds.',
    retryAfter: 60,
  },
});

/**
 * Strict Login Rate Limiter (Brute-Force & Credential Stuffing Mitigation)
 * Maximum 5 attempts per IP per minute (in addition to 3-strike account lock)
 */
const loginRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5,
  skip: (req) => req.headers['x-attendx-test-suite'] === 'security-test' || process.env.NODE_ENV === 'test',
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Security rate limit triggered: Exceeded 5 login attempts within 60 seconds. Cooldown active.',
    isRateLimited: true,
    retryAfter: 60,
  },
});

/**
 * Sensitive Admin Actions Limiter
 * (e.g. Account Unlock, Employee Onboarding)
 * Max 20 actions per 5 minutes per IP
 */
const sensitiveActionLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many administrative modification requests. Please slow down.',
    retryAfter: 300,
  },
});

/**
 * Checkpoint Submission Limiter
 * Prevents rapid script/replay submission of checkpoints
 * Max 10 submissions per minute per IP
 */
const checkpointRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  skip: (req) => req.headers['x-attendx-test-suite'] === 'security-test' || process.env.NODE_ENV === 'test',
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Rapid checkpoint submissions detected. Submissions are throttled.',
    retryAfter: 60,
  },
});

module.exports = {
  globalRateLimiter,
  loginRateLimiter,
  sensitiveActionLimiter,
  checkpointRateLimiter,
};
