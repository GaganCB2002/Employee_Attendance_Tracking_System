const prisma = require('../config/db');

const EmployeeModel = {
  findMany: (args) => prisma.employee.findMany(args),
  findUnique: (args) => prisma.employee.findUnique(args),
  findFirst: (args) => prisma.employee.findFirst(args),
  create: (args) => prisma.employee.create(args),
  update: (args) => prisma.employee.update(args),
  delete: (args) => prisma.employee.delete(args),
  count: (args) => prisma.employee.count(args),

  findByCode: (employeeCode) =>
    prisma.employee.findUnique({
      where: { employeeCode },
      include: { section: true, shift: { include: { checkpoints: { orderBy: { sequenceOrder: 'asc' } } } } },
    }),

  findByIdWithShiftAndSection: (id) =>
    prisma.employee.findUnique({
      where: { id },
      include: {
        section: true,
        shift: {
          include: {
            checkpoints: {
              orderBy: { sequenceOrder: 'asc' },
            },
          },
        },
      },
    }),

  listBySection: (sectionId, whereClause = {}) => {
    const where = sectionId ? { sectionId, ...whereClause } : whereClause;
    return prisma.employee.findMany({
      where,
      include: {
        section: true,
        shift: true,
      },
      orderBy: { name: 'asc' },
    });
  },

  lockAccount: (id, reason = 'Exceeded maximum failed password attempts') =>
    prisma.employee.update({
      where: { id },
      data: {
        status: 'LOCKED',
        lockedAt: new Date(),
        lockReason: reason,
      },
    }),

  unlockAccount: (id) =>
    prisma.employee.update({
      where: { id },
      data: {
        status: 'ACTIVE',
        failedAttempts: 0,
        lockedAt: null,
        lockReason: null,
      },
    }),
};

module.exports = EmployeeModel;
