const jwt = require('jsonwebtoken');
const config = require('../config/env');
const prisma = require('../config/db');
const TokenService = require('../services/token.service');

async function authMiddleware(req, res, next) {
  try {
    let token = null;
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.query && req.query.token) {
      token = req.query.token;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Authentication token required.',
      });
    }

    // 1. Check if token was explicitly blacklisted (logout / session wipe)
    if (TokenService.isTokenBlacklisted(token)) {
      return res.status(401).json({
        success: false,
        error: 'Session has ended. Token has been revoked.',
        tokenRevoked: true,
      });
    }

    const decoded = jwt.verify(token, config.jwtSecret);

    // 2. Check if token is stale (issued before a global logout or account lockout)
    if (TokenService.isTokenStale(decoded.id, decoded.iat)) {
      return res.status(401).json({
        success: false,
        error: 'Security event detected. Token was revoked — please re-authenticate.',
        tokenRevoked: true,
      });
    }

    // 3. Idle session timeout check (15 minutes of inactivity)
    const idleCheck = TokenService.recordActivityAndCheckIdle(decoded.id);
    if (idleCheck.isIdleExpired) {
      return res.status(401).json({
        success: false,
        error: 'Session expired due to 15 minutes of inactivity. Please log in again.',
        sessionIdle: true,
      });
    }

    if (decoded.role === 'SUPER_ADMIN' || decoded.role === 'SECTION_ADMIN') {
      const admin = await prisma.adminUser.findUnique({
        where: { id: decoded.id },
        include: { section: true },
      });

      if (!admin) {
        return res.status(401).json({ success: false, error: 'Admin account not found.' });
      }

      if (admin.status === 'LOCKED') {
        TokenService.revokeAllUserTokens(admin.id);
        return res.status(403).json({
          success: false,
          error: 'Admin account is locked due to security policy. Contact Super Admin.',
          isLocked: true,
        });
      }

      req.user = {
        id: admin.id,
        username: admin.username,
        name: admin.name,
        role: admin.role,
        sectionId: admin.sectionId,
        section: admin.section,
        type: 'ADMIN',
      };
    } else {
      // Employee token
      const employee = await prisma.employee.findUnique({
        where: { id: decoded.id },
        include: { section: true, shift: true },
      });

      if (!employee) {
        return res.status(401).json({ success: false, error: 'Employee account not found.' });
      }

      if (employee.status === 'LOCKED') {
        TokenService.revokeAllUserTokens(employee.id);
        return res.status(403).json({
          success: false,
          error: 'Employee account is locked due to 3 failed attempts. Contact your Section Admin to unlock.',
          isLocked: true,
        });
      }

      if (employee.status === 'INACTIVE') {
        return res.status(403).json({ success: false, error: 'Employee account is inactive.' });
      }

      req.user = {
        id: employee.id,
        employeeCode: employee.employeeCode,
        name: employee.name,
        role: 'EMPLOYEE',
        sectionId: employee.sectionId,
        section: employee.section,
        shiftId: employee.shiftId,
        shift: employee.shift,
        photoUrl: employee.photoUrl,
        type: 'EMPLOYEE',
      };
    }

    req.token = token;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, error: 'Session expired. Please log in again.' });
    }
    return res.status(401).json({ success: false, error: 'Invalid or tampered authentication token.' });
  }
}

module.exports = authMiddleware;
