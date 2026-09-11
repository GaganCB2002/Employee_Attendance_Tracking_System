const prisma = require('../config/db');

const ShiftModel = {
  findMany: (args) => prisma.shift.findMany(args),
  findUnique: (args) => prisma.shift.findUnique(args),
  create: (args) => prisma.shift.create(args),
  update: (args) => prisma.shift.update(args),
  delete: (args) => prisma.shift.delete(args),

  listWithCheckpoints: (sectionId) => {
    const where = sectionId ? { OR: [{ sectionId }, { sectionId: null }] } : {};
    return prisma.shift.findMany({
      where,
      include: {
        section: true,
        checkpoints: {
          orderBy: { sequenceOrder: 'asc' },
        },
        _count: {
          select: { employees: true },
        },
      },
      orderBy: { startTime: 'asc' },
    });
  },

  findByIdWithCheckpoints: (id) =>
    prisma.shift.findUnique({
      where: { id },
      include: {
        section: true,
        checkpoints: {
          orderBy: { sequenceOrder: 'asc' },
        },
      },
    }),
};

module.exports = ShiftModel;
