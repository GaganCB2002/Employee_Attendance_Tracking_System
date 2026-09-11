const prisma = require('../config/db');

const AdminUserModel = {
  findMany: (args) => prisma.adminUser.findMany(args),
  findUnique: (args) => prisma.adminUser.findUnique(args),
  create: (args) => prisma.adminUser.create(args),
  update: (args) => prisma.adminUser.update(args),
  delete: (args) => prisma.adminUser.delete(args),

  findByUsername: (username) =>
    prisma.adminUser.findUnique({
      where: { username },
      include: { section: true },
    }),

  lockAccount: (id) =>
    prisma.adminUser.update({
      where: { id },
      data: {
        status: 'LOCKED',
        lockedAt: new Date(),
      },
    }),

  unlockAccount: (id) =>
    prisma.adminUser.update({
      where: { id },
      data: {
        status: 'ACTIVE',
        failedAttempts: 0,
        lockedAt: null,
      },
    }),
};

module.exports = AdminUserModel;
