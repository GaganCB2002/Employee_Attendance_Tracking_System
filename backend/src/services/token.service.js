const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const config = require('../config/env');

// In-memory blacklist for invalidated single access tokens: tokenSignature -> expiresAt
const tokenBlacklist = new Map();

// User-level revocation timestamps: userId -> timestamp (ms)
// Any token issued before this timestamp is considered stale/revoked
const userRevocationTimestamps = new Map();

// Session activity timestamp: userId -> timestamp (ms)
const sessionActivityTimestamps = new Map();

// Rotating refresh token store: refreshToken -> { userId, role, expiresAt, used: boolean }
const refreshTokenStore = new Map();

// 15-minute idle session timeout
const IDLE_TIMEOUT_MS = 15 * 60 * 1000;

// Token service clean-up interval (removes expired tokens from memory every 10 min)
setInterval(() => {
  const now = Date.now();
  for (const [token, exp] of tokenBlacklist.entries()) {
    if (exp <= now) tokenBlacklist.delete(token);
  }
  for (const [rToken, data] of refreshTokenStore.entries()) {
    if (data.expiresAt <= now) refreshTokenStore.delete(rToken);
  }
}, 10 * 60 * 1000).unref();

const TokenService = {
  /**
   * Generates a short-lived (15 min) JWT Access Token
   */
  generateAccessToken(payload) {
    const jti = crypto.randomBytes(16).toString('hex');
    const token = jwt.sign(
      {
        ...payload,
        jti,
      },
      config.jwtSecret,
      { expiresIn: '15m' }
    );
    // Record initial activity
    if (payload.id) {
      sessionActivityTimestamps.set(payload.id, Date.now());
    }
    return token;
  },

  /**
   * Generates a cryptographically strong, single-use Rotating Refresh Token (valid 7 days)
   */
  generateRefreshToken(userId, role) {
    const refreshToken = crypto.randomBytes(48).toString('hex');
    const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;

    refreshTokenStore.set(refreshToken, {
      userId,
      role,
      expiresAt,
      used: false,
    });

    return refreshToken;
  },

  /**
   * Rotates a refresh token:
   * Single-use policy: if already used, detects replay/theft and invalidates all user tokens!
   */
  rotateRefreshToken(oldToken) {
    const record = refreshTokenStore.get(oldToken);

    if (!record) {
      return { success: false, error: 'Invalid or expired refresh token.' };
    }

    // Reuse detection (theft flag)
    if (record.used) {
      console.error(`[SECURITY:REFRESH_THEFT_DETECTED] Replay attack detected for user ${record.userId}! Revoking all sessions.`);
      this.revokeAllUserTokens(record.userId);
      return { success: false, error: 'Security violation: Refresh token replay detected. All sessions revoked.', theftDetected: true };
    }

    // Expiration check
    if (Date.now() > record.expiresAt) {
      refreshTokenStore.delete(oldToken);
      return { success: false, error: 'Refresh token has expired. Please log in again.' };
    }

    // Mark as used
    record.used = true;
    refreshTokenStore.set(oldToken, record);

    // Issue new pair
    const newRefreshToken = this.generateRefreshToken(record.userId, record.role);
    return {
      success: true,
      userId: record.userId,
      role: record.role,
      newRefreshToken,
    };
  },

  /**
   * Invalidate a specific access token (e.g. on explicit logout)
   */
  blacklistToken(token) {
    if (!token) return;
    try {
      const decoded = jwt.decode(token);
      const exp = decoded?.exp ? decoded.exp * 1000 : Date.now() + 15 * 60 * 1000;
      tokenBlacklist.set(token, exp);
    } catch {
      tokenBlacklist.set(token, Date.now() + 15 * 60 * 1000);
    }
  },

  /**
   * Checks if an access token has been explicitly blacklisted
   */
  isTokenBlacklisted(token) {
    if (!token) return true;
    return tokenBlacklist.has(token);
  },

  /**
   * Revokes all active tokens for a user (on lockout or theft detection)
   */
  revokeAllUserTokens(userId) {
    if (!userId) return;
    userRevocationTimestamps.set(userId, Date.now());
    sessionActivityTimestamps.delete(userId);

    // Invalidate all refresh tokens for this user
    for (const [rToken, data] of refreshTokenStore.entries()) {
      if (data.userId === userId) {
        refreshTokenStore.delete(rToken);
      }
    }
  },

  /**
   * Clears the user revocation timestamp upon successful authentication / unlock
   */
  clearUserRevocation(userId) {
    if (userId) {
      userRevocationTimestamps.delete(userId);
    }
  },

  /**
   * Checks whether token was issued before the user's latest revocation time
   */
  isTokenStale(userId, issuedAtSeconds) {
    const revokedAfter = userRevocationTimestamps.get(userId);
    if (!revokedAfter) return false;
    const tokenIssuedSeconds = issuedAtSeconds || 0;
    const revokedAfterSeconds = Math.floor(revokedAfter / 1000);
    return tokenIssuedSeconds < revokedAfterSeconds;
  },

  /**
   * Tracks user activity and verifies 15-minute idle timeout policy
   */
  recordActivityAndCheckIdle(userId) {
    const now = Date.now();
    const lastActive = sessionActivityTimestamps.get(userId);

    if (lastActive && now - lastActive > IDLE_TIMEOUT_MS) {
      // Idle timeout exceeded
      this.revokeAllUserTokens(userId);
      return { isIdleExpired: true };
    }

    sessionActivityTimestamps.set(userId, now);
    return { isIdleExpired: false };
  },
};

module.exports = TokenService;
