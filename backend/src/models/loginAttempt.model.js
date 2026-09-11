const prisma = require('../config/db');

const LoginAttemptModel = {
  findMany: (args) => prisma.loginAttempt.findMany(args),
  create: (args) => prisma.loginAttempt.create(args),

  recordAttempt: async ({ identifier, userType, ipAddress, userAgent, success, failureReason }) => {
    return prisma.loginAttempt.create({
      data: {
        identifier,
        userType,
        ipAddress,
        userAgent,
        success,
        failureReason,
      },
    });
  },

  getRecentFailedCount: async (identifier, minutesBack = 60) => {
    const since = new Date(Date.now() - minutesBack * 60 * 1000);
    // Find consecutive failures since last successful login
    const attempts = await prisma.loginAttempt.findMany({
      where: {
        identifier,
        createdAt: { gte: since },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    let consecutiveFails = 0;
    for (const att of attempts) {
      if (!att.success) {
        consecutiveFails++;
      } else {
        break; // stop at last success
      }
    }

    return consecutiveFails;
  },
};

module.exports = LoginAttemptModel;
