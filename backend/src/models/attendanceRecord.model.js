const prisma = require('../config/db');

const AttendanceRecordModel = {
  findMany: (args) => prisma.attendanceRecord.findMany(args),
  findUnique: (args) => prisma.attendanceRecord.findUnique(args),
  create: (args) => prisma.attendanceRecord.create(args),
  update: (args) => prisma.attendanceRecord.update(args),
  delete: (args) => prisma.attendanceRecord.delete(args),
  count: (args) => prisma.attendanceRecord.count(args),

  listDetailed: ({ where = {}, take = 50, skip = 0, orderBy = { actualTime: 'desc' } }) =>
    prisma.attendanceRecord.findMany({
      where,
      take,
      skip,
      orderBy,
      include: {
        employee: {
          select: {
            id: true,
            employeeCode: true,
            name: true,
            photoUrl: true,
            section: { select: { id: true, name: true, code: true } },
          },
        },
        checkpoint: {
          select: {
            id: true,
            name: true,
            type: true,
            sequenceOrder: true,
            expectedTime: true,
          },
        },
        shift: {
          select: {
            id: true,
            name: true,
            startTime: true,
            endTime: true,
          },
        },
      },
    }),

  getFolderStructure: async ({ sectionId, date }) => {
    // Hierarchical query: Section -> Employees -> Records
    const sectionWhere = sectionId ? { id: sectionId } : {};

    const sections = await prisma.section.findMany({
      where: sectionWhere,
      include: {
        employees: {
          include: {
            shift: true,
            records: {
              where: date ? { date } : {},
              include: {
                checkpoint: true,
              },
              orderBy: { actualTime: 'asc' },
            },
          },
          orderBy: { name: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });

    return sections;
  },
};

module.exports = AttendanceRecordModel;
