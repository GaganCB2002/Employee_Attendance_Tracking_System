const bcrypt = require('bcryptjs');
const prisma = require('../config/db');
const config = require('../config/env');
const TokenService = require('../services/token.service');
const { handleFailedAttempt, resetFailedAttempts } = require('../middleware/lockoutMiddleware');
const { broadcastLockoutEvent } = require('../sockets/liveEvents.socket');

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'Strict',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/api/auth',
};

const AuthController = {
  /**
   * Universal Login for Super Admin, Section Admin, and Employees
   * Enforces 3-strike lockout, short-lived 15m access token, and rotating refresh token cookie.
   */
  login: async (req, res) => {
    try {
      const { identifier, password } = req.body;
      const ipAddress = req.ip || req.connection?.remoteAddress || '127.0.0.1';
      const userAgent = req.headers['user-agent'] || 'Unknown';

      if (!identifier || !password) {
        return res.status(400).json({
          success: false,
          error: 'Identifier (username or employee ID) and password are required.',
        });
      }

      const cleanId = identifier.trim();

      // 1. Try finding an Admin User
      const admin = await prisma.adminUser.findUnique({
        where: { username: cleanId },
        include: { section: true },
      });

      if (admin) {
        if (admin.status === 'LOCKED') {
          TokenService.revokeAllUserTokens(admin.id);
          return res.status(403).json({
            success: false,
            isLocked: true,
            error: 'Account locked due to 3 failed attempts. Contact Super Admin to unlock.',
          });
        }

        const isMatch = await bcrypt.compare(password, admin.passwordHash);

        if (!isMatch) {
          const outcome = await handleFailedAttempt({
            identifier: cleanId,
            targetUser: { ...admin, targetType: 'ADMIN' },
            ipAddress,
            userAgent,
            reason: 'Invalid admin credentials',
          });

          if (outcome.isLocked) {
            TokenService.revokeAllUserTokens(admin.id);
            broadcastLockoutEvent({
              id: admin.id,
              user: `${admin.name} (${admin.username})`,
              fails: outcome.fails,
              locked: true,
              device: userAgent.slice(0, 30),
              time: new Date().toISOString(),
            });
          }

          return res.status(401).json({
            success: false,
            error: outcome.isLocked
              ? 'Account has been LOCKED after 3 failed attempts.'
              : `Invalid password. Attempt ${outcome.fails} of ${config.maxFailedAttempts}.`,
            isLocked: outcome.isLocked,
            remainingAttempts: outcome.remaining,
          });
        }

        // Success - reset failures and clear revocation timestamp
        await resetFailedAttempts({ id: admin.id, targetType: 'ADMIN' });
        TokenService.clearUserRevocation(admin.id);

        // Record successful login
        await prisma.loginAttempt.create({
          data: {
            identifier: cleanId,
            userType: 'ADMIN',
            ipAddress,
            userAgent,
            success: true,
          },
        });

        // Short-lived (15 min) access token
        const token = TokenService.generateAccessToken({
          id: admin.id,
          username: admin.username,
          name: admin.name,
          role: admin.role,
          sectionId: admin.sectionId,
        });

        // Rotating refresh token stored in httpOnly, Secure, SameSite=Strict cookie
        const refreshToken = TokenService.generateRefreshToken(admin.id, admin.role);
        res.cookie('attendx_refresh', refreshToken, REFRESH_COOKIE_OPTIONS);

        return res.json({
          success: true,
          token,
          user: {
            id: admin.id,
            username: admin.username,
            name: admin.name,
            role: admin.role,
            sectionId: admin.sectionId,
            section: admin.section,
          },
        });
      }

      // 2. Try finding an Employee
      const employee = await prisma.employee.findUnique({
        where: { employeeCode: cleanId },
        include: {
          section: true,
          shift: {
            include: {
              checkpoints: { orderBy: { sequenceOrder: 'asc' } },
            },
          },
        },
      });

      if (employee) {
        if (employee.status === 'LOCKED') {
          TokenService.revokeAllUserTokens(employee.id);
          return res.status(403).json({
            success: false,
            isLocked: true,
            error: `Account locked (${employee.employeeCode}). Please contact Section Admin to unlock.`,
          });
        }

        if (employee.status === 'INACTIVE') {
          return res.status(403).json({
            success: false,
            error: 'Employee account is deactivated. Contact HR or Section Admin.',
          });
        }

        const isMatch = await bcrypt.compare(password, employee.passwordHash);

        if (!isMatch) {
          const outcome = await handleFailedAttempt({
            identifier: cleanId,
            targetUser: { ...employee, targetType: 'EMPLOYEE' },
            ipAddress,
            userAgent,
            reason: 'Invalid employee credentials',
          });

          if (outcome.isLocked) {
            TokenService.revokeAllUserTokens(employee.id);
            broadcastLockoutEvent({
              id: employee.id,
              user: `${employee.name} (${employee.employeeCode})`,
              fails: outcome.fails,
              locked: true,
              device: userAgent.slice(0, 30),
              time: new Date().toISOString(),
            });
          }

          return res.status(401).json({
            success: false,
            error: outcome.isLocked
              ? 'Account has been LOCKED after 3 failed attempts.'
              : `Invalid password. Attempt ${outcome.fails} of ${config.maxFailedAttempts}.`,
            isLocked: outcome.isLocked,
            remainingAttempts: outcome.remaining,
          });
        }

        // Success - reset failures and clear revocation timestamp
        await resetFailedAttempts({ id: employee.id, targetType: 'EMPLOYEE' });
        TokenService.clearUserRevocation(employee.id);

        // Record successful login
        await prisma.loginAttempt.create({
          data: {
            identifier: cleanId,
            userType: 'EMPLOYEE',
            ipAddress,
            userAgent,
            success: true,
          },
        });

        // Short-lived access token
        const token = TokenService.generateAccessToken({
          id: employee.id,
          employeeCode: employee.employeeCode,
          name: employee.name,
          role: 'EMPLOYEE',
          sectionId: employee.sectionId,
          shiftId: employee.shiftId,
        });

        // Rotating refresh token
        const refreshToken = TokenService.generateRefreshToken(employee.id, 'EMPLOYEE');
        res.cookie('attendx_refresh', refreshToken, REFRESH_COOKIE_OPTIONS);

        return res.json({
          success: true,
          token,
          user: {
            id: employee.id,
            employeeCode: employee.employeeCode,
            name: employee.name,
            role: 'EMPLOYEE',
            sectionId: employee.sectionId,
            section: employee.section,
            shiftId: employee.shiftId,
            shift: employee.shift,
            photoUrl: employee.photoUrl,
          },
        });
      }

      // User not found in either table
      await handleFailedAttempt({
        identifier: cleanId,
        targetUser: null,
        ipAddress,
        userAgent,
        reason: 'User identifier not found',
      });

      return res.status(401).json({
        success: false,
        error: 'Invalid username or employee ID.',
      });
    } catch (error) {
      console.error('[AUTH:LOGIN_ERROR]', error);
      return res.status(500).json({ success: false, error: 'Internal server error during authentication.' });
    }
  },

  /**
   * Rotating Refresh Token Endpoint
   * Rotates single-use refresh token, issues fresh 15m access token, detects replay theft.
   */
  refresh: async (req, res) => {
    try {
      const incomingRefreshToken = req.cookies?.['attendx_refresh'];

      if (!incomingRefreshToken) {
        return res.status(401).json({
          success: false,
          error: 'Refresh token cookie missing.',
        });
      }

      const result = TokenService.rotateRefreshToken(incomingRefreshToken);

      if (!result.success) {
        res.clearCookie('attendx_refresh', { path: '/api/auth' });
        return res.status(401).json({
          success: false,
          error: result.error,
          theftDetected: result.theftDetected || false,
        });
      }

      // User lookup to populate fresh token
      let payload = { id: result.userId, role: result.role };
      if (result.role === 'SUPER_ADMIN' || result.role === 'SECTION_ADMIN') {
        const admin = await prisma.adminUser.findUnique({ where: { id: result.userId } });
        if (!admin || admin.status === 'LOCKED') {
          return res.status(403).json({ success: false, error: 'Account is locked or inactive.' });
        }
        payload = {
          id: admin.id,
          username: admin.username,
          name: admin.name,
          role: admin.role,
          sectionId: admin.sectionId,
        };
      } else {
        const employee = await prisma.employee.findUnique({ where: { id: result.userId } });
        if (!employee || employee.status === 'LOCKED' || employee.status === 'INACTIVE') {
          return res.status(403).json({ success: false, error: 'Account is locked or inactive.' });
        }
        payload = {
          id: employee.id,
          employeeCode: employee.employeeCode,
          name: employee.name,
          role: 'EMPLOYEE',
          sectionId: employee.sectionId,
          shiftId: employee.shiftId,
        };
      }

      const newAccessToken = TokenService.generateAccessToken(payload);
      res.cookie('attendx_refresh', result.newRefreshToken, REFRESH_COOKIE_OPTIONS);

      return res.json({
        success: true,
        token: newAccessToken,
      });
    } catch (error) {
      console.error('[AUTH:REFRESH_ERROR]', error);
      return res.status(500).json({ success: false, error: 'Failed to refresh token.' });
    }
  },

  /**
   * Get Current Authenticated User Profile
   */
  getMe: async (req, res) => {
    return res.json({
      success: true,
      user: req.user,
    });
  },

  /**
   * Hardened Logout: Blacklists access token server-side and clears refresh cookie
   */
  logout: async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        TokenService.blacklistToken(token);
      }
      if (req.user?.id) {
        TokenService.revokeAllUserTokens(req.user.id);
      }

      res.clearCookie('attendx_refresh', { path: '/api/auth' });

      return res.json({
        success: true,
        message: 'Logged out successfully. Server invalidated session tokens.',
      });
    } catch (error) {
      return res.status(500).json({ success: false, error: 'Logout failed.' });
    }
  },

  /**
   * Intercepts browser Back-button or idle session timeout
   */
  lockSession: async (req, res) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      TokenService.blacklistToken(authHeader.split(' ')[1]);
    }
    return res.json({
      success: true,
      locked: true,
      message: 'Session locked for security. Access token revoked on server.',
    });
  },
};

module.exports = AuthController;
