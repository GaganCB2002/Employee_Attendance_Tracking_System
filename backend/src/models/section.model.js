const prisma = require('../config/db');

const SectionModel = {
  findMany: (args) => prisma.section.findMany(args),
  findUnique: (args) => prisma.section.findUnique(args),
  create: (args) => prisma.section.create(args),
  update: (args) => prisma.section.update(args),
  delete: (args) => prisma.section.delete(args),

  listWithCounts: () =>
    prisma.section.findMany({
      include: {
        _count: {
          select: {
            employees: true,
            shifts: true,
            geofences: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    }),

  findByIdWithDetails: (id) =>
    prisma.section.findUnique({
      where: { id },
      include: {
        shifts: {
          include: {
            checkpoints: { orderBy: { sequenceOrder: 'asc' } },
          },
        },
        geofences: true,
        employees: {
          where: { status: 'ACTIVE' },
          select: {
            id: true,
            employeeCode: true,
            name: true,
            photoUrl: true,
          },
        },
      },
    }),
};

module.exports = SectionModel;
