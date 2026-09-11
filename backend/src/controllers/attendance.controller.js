const prisma = require('../config/db');

function getTodayString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const AttendanceController = {
  /**
   * List and filter attendance records with server-side section scoping
   */
  list: async (req, res) => {
    try {
      const { date, status, shiftId, limit = 50, page = 1 } = req.query;
      const sectionFilter = req.scopedSectionId || req.query.sectionId;

      const where = {};

      if (date) {
        where.date = date;
      }

      if (status && status !== 'ALL') {
        where.status = status;
      }

      if (shiftId) {
        where.shiftId = shiftId;
      }

      if (sectionFilter) {
        where.employee = { sectionId: sectionFilter };
      }

      const take = Math.min(parseInt(limit, 10) || 50, 200);
      const skip = (Math.max(parseInt(page, 10) || 1, 1) - 1) * take;

      const [records, total] = await Promise.all([
        prisma.attendanceRecord.findMany({
          where,
          include: {
            employee: {
              select: {
                id: true,
                employeeCode: true,
                name: true,
                photoUrl: true,
                section: true,
              },
            },
            checkpoint: true,
            shift: true,
          },
          orderBy: { actualTime: 'desc' },
          take,
          skip,
        }),
        prisma.attendanceRecord.count({ where }),
      ]);

      return res.json({
        success: true,
        data: records,
        pagination: {
          total,
          page: parseInt(page, 10) || 1,
          limit: take,
          totalPages: Math.ceil(total / take),
        },
      });
    } catch (error) {
      console.error('[ATTENDANCE:LIST_ERROR]', error);
      return res.status(500).json({ success: false, error: 'Failed to retrieve attendance records.' });
    }
  },

  /**
   * Folder-wise view: Section -> Employee -> Date -> Checkpoints
   */
  getFolderView: async (req, res) => {
    try {
      const sectionFilter = req.scopedSectionId || req.query.sectionId;
      const dateFilter = req.query.date || getTodayString();

      const whereSection = sectionFilter ? { id: sectionFilter } : {};

      const sections = await prisma.section.findMany({
        where: whereSection,
        include: {
          employees: {
            where: { status: 'ACTIVE' },
            include: {
              shift: true,
              records: {
                where: dateFilter ? { date: dateFilter } : {},
                include: { checkpoint: true },
                orderBy: { actualTime: 'asc' },
              },
            },
            orderBy: { name: 'asc' },
          },
        },
        orderBy: { name: 'asc' },
      });

      return res.json({
        success: true,
        date: dateFilter,
        data: sections,
      });
    } catch (error) {
      console.error('[ATTENDANCE:FOLDER_ERROR]', error);
      return res.status(500).json({ success: false, error: 'Failed to generate folder view.' });
    }
  },

  /**
   * My attendance records (for authenticated employee)
   */
  getMyRecords: async (req, res) => {
    try {
      const employeeId = req.user.id;
      const date = req.query.date || getTodayString();

      const records = await prisma.attendanceRecord.findMany({
        where: { employeeId, date },
        include: {
          checkpoint: true,
          shift: true,
        },
        orderBy: { actualTime: 'asc' },
      });

      return res.json({
        success: true,
        date,
        data: records,
      });
    } catch (error) {
      console.error('[ATTENDANCE:MY_RECORDS_ERROR]', error);
      return res.status(500).json({ success: false, error: 'Failed to fetch personal attendance.' });
    }
  },

  /**
   * Approve exception on a late or flagged record (Admin action)
   */
  approveException: async (req, res) => {
    try {
      const { id } = req.params;
      const { notes } = req.body;

      const record = await prisma.attendanceRecord.findUnique({
        where: { id },
        include: { employee: true },
      });

      if (!record) {
        return res.status(404).json({ success: false, error: 'Attendance record not found.' });
      }

      // Check section scoping for section admin
      if (req.user.role === 'SECTION_ADMIN' && record.employee?.sectionId !== req.user.sectionId) {
        return res.status(403).json({
          success: false,
          error: 'Access denied: Cannot approve exception for another section.',
        });
      }

      const updated = await prisma.attendanceRecord.update({
        where: { id },
        data: {
          status: 'ON_TIME',
          approvedException: true,
          approvedBy: req.user.name || req.user.username,
          notes: notes ? `${record.notes || ''} [Approved: ${notes}]` : record.notes,
        },
        include: {
          employee: { include: { section: true } },
          checkpoint: true,
          shift: true,
        },
      });

      // Audit log
      await prisma.auditLog.create({
        data: {
          action: 'EXCEPTION_APPROVED',
          entityType: 'AttendanceRecord',
          entityId: id,
          actorId: req.user.id,
          actorRole: req.user.role,
          details: {
            employeeId: record.employeeId,
            previousStatus: record.status,
            approvedBy: req.user.name,
          },
        },
      });

      return res.json({
        success: true,
        message: 'Exception approved. Record status marked as ON_TIME.',
        data: updated,
      });
    } catch (error) {
      console.error('[ATTENDANCE:APPROVE_ERROR]', error);
      return res.status(500).json({ success: false, error: 'Failed to approve exception.' });
    }
  },
};

module.exports = AttendanceController;
