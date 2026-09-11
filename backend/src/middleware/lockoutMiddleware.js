const prisma = require('../config/db');
const config = require('../config/env');
const NotificationService = require('../services/notification.service');

/**
 * Checks if the account associated with the identifier is currently locked before attempting login.
 */
async function checkLockoutStatus(req, res, next) {
  const { identifier } = req.body;
  if (!identifier) {
    return res.status(400).json({ success: false, error: 'Identifier (username or employee ID) is required.' });
  }

  const cleanIdentifier = identifier.trim();

  // Check Admin first
  const admin = await prisma.adminUser.findUnique({
    where: { username: cleanIdentifier },
  });

  if (admin) {
    if (admin.status === 'LOCKED') {
      return res.status(403).json({
        success: false,
        isLocked: true,
        error: 'Admin account is locked due to 3 consecutive failed attempts. Contact Super Admin to restore access.',
      });
    }
    req.targetUser = { ...admin, targetType: 'ADMIN' };
    return next();
  }

  // Check Employee
  const employee = await prisma.employee.findUnique({
    where: { employeeCode: cleanIdentifier },
    include: { section: true },
  });

  if (employee) {
    if (employee.status === 'LOCKED') {
      return res.status(403).json({
        success: false,
        isLocked: true,
        error: `Employee account locked (${employee.employeeCode}). Please contact ${employee.section?.name || 'your'} Section Admin to unlock.`,
      });
    }
    req.targetUser = { ...employee, targetType: 'EMPLOYEE' };
    return next();
  }

  // If user doesn't exist yet, continue to controller which will return invalid credentials
  req.targetUser = null;
  next();
}

/**
 * Helper to record a failed attempt and enforce 3-strike lockout immediately.
 */
async function handleFailedAttempt({ identifier, targetUser, ipAddress, userAgent, reason }) {
  const cleanId = identifier ? identifier.trim() : 'UNKNOWN';

  // 1. Record in LoginAttempt
  await prisma.loginAttempt.create({
    data: {
      identifier: cleanId,
      userType: targetUser ? targetUser.targetType : 'UNKNOWN',
      ipAddress: ipAddress || '127.0.0.1',
      userAgent: userAgent || 'Unknown Client',
      success: false,
      failureReason: reason || 'Invalid password credentials',
    },
  });

  if (!targetUser) {
    return { fails: 1, isLocked: false, remaining: config.maxFailedAttempts - 1 };
  }

  const newFailedCount = (targetUser.failedAttempts || 0) + 1;
  const isLocked = newFailedCount >= config.maxFailedAttempts;

  if (targetUser.targetType === 'ADMIN') {
    await prisma.adminUser.update({
      where: { id: targetUser.id },
      data: {
        failedAttempts: newFailedCount,
        status: isLocked ? 'LOCKED' : targetUser.status,
        lockedAt: isLocked ? new Date() : targetUser.lockedAt,
      },
    });
  } else if (targetUser.targetType === 'EMPLOYEE') {
    await prisma.employee.update({
      where: { id: targetUser.id },
      data: {
        failedAttempts: newFailedCount,
        status: isLocked ? 'LOCKED' : targetUser.status,
        lockedAt: isLocked ? new Date() : targetUser.lockedAt,
        lockReason: isLocked ? `Locked after ${newFailedCount} failed login attempts` : null,
      },
    });
  }

  if (isLocked) {
    await NotificationService.sendLockoutAlert({
      identifier: cleanId,
      userType: targetUser.targetType,
      ipAddress,
    });

    // Record audit log
    await prisma.auditLog.create({
      data: {
        action: 'ACCOUNT_LOCKED',
        entityType: targetUser.targetType === 'ADMIN' ? 'AdminUser' : 'Employee',
        entityId: targetUser.id,
        actorId: 'SYSTEM_SECURITY',
        actorRole: 'SYSTEM',
        ipAddress,
        details: {
          identifier: cleanId,
          reason: '3 consecutive failed password attempts',
          lockedAt: new Date().toISOString(),
        },
      },
    });
  }

  return {
    fails: newFailedCount,
    isLocked,
    remaining: Math.max(0, config.maxFailedAttempts - newFailedCount),
  };
}

/**
 * Resets failed attempt counter on successful authentication
 */
async function resetFailedAttempts(targetUser) {
  if (!targetUser) return;
  if (targetUser.targetType === 'ADMIN') {
    await prisma.adminUser.update({
      where: { id: targetUser.id },
      data: { failedAttempts: 0 },
    });
  } else if (targetUser.targetType === 'EMPLOYEE') {
    await prisma.employee.update({
      where: { id: targetUser.id },
      data: { failedAttempts: 0 },
    });
  }
}

module.exports = {
  checkLockoutStatus,
  handleFailedAttempt,
  resetFailedAttempts,
};
