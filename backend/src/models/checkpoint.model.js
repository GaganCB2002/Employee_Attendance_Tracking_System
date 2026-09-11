const prisma = require('../config/db');

const CheckpointModel = {
  findMany: (args) => prisma.checkpoint.findMany(args),
  findUnique: (args) => prisma.checkpoint.findUnique(args),
  create: (args) => prisma.checkpoint.create(args),
  update: (args) => prisma.checkpoint.update(args),
  delete: (args) => prisma.checkpoint.delete(args),

  findByShiftOrdered: (shiftId) =>
    prisma.checkpoint.findMany({
      where: { shiftId },
      orderBy: { sequenceOrder: 'asc' },
    }),

  findNextForEmployee: async (employeeId, shiftId, todayDateStr) => {
    // Get all completed checkpoints for today
    const completedRecords = await prisma.attendanceRecord.findMany({
      where: {
        employeeId,
        shiftId,
        date: todayDateStr,
      },
      select: { checkpointId: true },
    });

    const completedIds = new Set(completedRecords.map((r) => r.checkpointId));

    // Get all checkpoints for this shift in order
    const allCheckpoints = await prisma.checkpoint.findMany({
      where: { shiftId },
      orderBy: { sequenceOrder: 'asc' },
    });

    // Find the first checkpoint that is not yet completed
    const nextCheckpoint = allCheckpoints.find((cp) => !completedIds.has(cp.id));
    return {
      nextCheckpoint: nextCheckpoint || null,
      allCheckpoints,
      completedCount: completedIds.size,
      totalCount: allCheckpoints.length,
      isShiftComplete: completedIds.size >= allCheckpoints.length,
    };
  },
};

module.exports = CheckpointModel;
