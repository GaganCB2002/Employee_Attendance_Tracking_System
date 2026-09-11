const prisma = require('../config/db');
const { formatDuration } = require('../services/statusEngine.service');

const ReportsController = {
  /**
   * Get filtered report data (attendance, activity, department, floor)
   */
  getReportData: async (req, res) => {
    try {
      const { type = 'attendance', departmentId, floorId, date } = req.query;
      const targetDate = date || new Date().toISOString().split('T')[0];

      if (type === 'attendance') {
        const records = await prisma.attendanceRecord.findMany({
          where: {
            date: targetDate,
            ...(departmentId ? { employee: { departmentId } } : {}),
            ...(floorId ? { employee: { floorId } } : {}),
          },
          include: {
            employee: {
              include: { department: true, floor: true },
            },
            checkpoint: true,
            shift: true,
          },
          orderBy: { actualTime: 'desc' },
        });

        const rows = records.map((r) => ({
          employeeName: r.employee.name,
          employeeCode: r.employee.employeeCode,
          department: r.employee.department?.name || 'General',
          floor: r.employee.floor?.name || 'Ground Floor',
          checkpoint: r.checkpoint.name,
          status: r.status,
          time: new Date(r.actualTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          geofenceStatus: r.geofenceStatus,
          distanceMeters: r.distanceToZone,
        }));

        return res.json({ success: true, type, count: rows.length, data: rows });
      }

      if (type === 'activity') {
        const sessions = await prisma.attendanceSession.findMany({
          where: {
            date: targetDate,
            ...(departmentId ? { employee: { departmentId } } : {}),
            ...(floorId ? { employee: { floorId } } : {}),
          },
          include: {
            employee: {
              include: { department: true, floor: true },
            },
          },
        });

        const rows = sessions.map((s) => ({
          employeeName: s.employee.name,
          employeeCode: s.employee.employeeCode,
          department: s.employee.department?.name || 'General',
          floor: s.employee.floor?.name || 'Ground Floor',
          status: s.status,
          activeTime: formatDuration(s.activeSeconds),
          idleTime: formatDuration(s.idleSeconds),
          breakTime: formatDuration(s.breakSeconds),
          callTime: formatDuration(s.callSeconds),
          meetingTime: formatDuration(s.meetingSeconds),
          isLate: s.isLate ? 'YES' : 'NO',
          lateDuration: `${s.lateMinutes}m`,
        }));

        return res.json({ success: true, type, count: rows.length, data: rows });
      }

      if (type === 'department') {
        const departments = await prisma.department.findMany({
          include: {
            employees: {
              include: {
                attendanceSessions: { where: { date: targetDate } },
              },
            },
          },
        });

        const rows = departments.map((d) => {
          const total = d.employees.length;
          let present = 0;
          let late = 0;
          let active = 0;
          let onBreak = 0;

          d.employees.forEach((emp) => {
            const sess = emp.attendanceSessions[0];
            if (sess) {
              present++;
              if (sess.isLate) late++;
              if (sess.status === 'ACTIVE') active++;
              if (sess.status === 'BREAK' || sess.status === 'LONG_BREAK') onBreak++;
            }
          });

          return {
            department: d.name,
            code: d.code,
            totalEmployees: total,
            presentEmployees: present,
            absentEmployees: Math.max(0, total - present),
            activeEmployees: active,
            breakEmployees: onBreak,
            lateEmployees: late,
            attendanceRate: total > 0 ? `${((present / total) * 100).toFixed(1)}%` : '0%',
          };
        });

        return res.json({ success: true, type, count: rows.length, data: rows });
      }

      if (type === 'floor') {
        const floors = await prisma.floor.findMany({
          include: {
            employees: {
              include: {
                attendanceSessions: { where: { date: targetDate } },
              },
            },
          },
          orderBy: { level: 'asc' },
        });

        const rows = floors.map((f) => {
          const total = f.employees.length;
          let present = 0;
          let active = 0;

          f.employees.forEach((emp) => {
            const sess = emp.attendanceSessions[0];
            if (sess) {
              present++;
              if (sess.status === 'ACTIVE') active++;
            }
          });

          return {
            floor: f.name,
            level: f.level,
            totalOccupants: total,
            presentOccupants: present,
            activeOccupants: active,
            occupancyRate: total > 0 ? `${((present / total) * 100).toFixed(1)}%` : '0%',
          };
        });

        return res.json({ success: true, type, count: rows.length, data: rows });
      }

      return res.status(400).json({ success: false, error: 'Invalid report type requested.' });
    } catch (error) {
      console.error('[REPORTS:GET_ERROR]', error);
      return res.status(500).json({ success: false, error: 'Failed to generate report.' });
    }
  },

  /**
   * Export report directly as CSV file
   */
  exportCsv: async (req, res) => {
    try {
      const { type = 'attendance' } = req.query;
      // We can call getReportData directly internally or construct CSV
      req.query.format = 'json';
      const fakeRes = {
        status: (code) => ({
          json: (data) => data,
        }),
      };

      // Query data
      const response = await new Promise((resolve) => {
        ReportsController.getReportData(req, {
          status: () => ({ json: resolve }),
          json: resolve,
        });
      });

      if (!response || !response.data || response.data.length === 0) {
        return res.status(404).send('No records found for export.');
      }

      const headers = Object.keys(response.data[0]);
      const csvLines = [
        headers.join(','),
        ...response.data.map((row) =>
          headers.map((h) => `"${String(row[h] || '').replace(/"/g, '""')}"`).join(',')
        ),
      ];
      const csvContent = csvLines.join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=attendx-${type}-report-${Date.now()}.csv`);
      return res.send(csvContent);
    } catch (error) {
      console.error('[REPORTS:EXPORT_CSV_ERROR]', error);
      return res.status(500).json({ success: false, error: 'Failed to export CSV report.' });
    }
  },
};

module.exports = ReportsController;
