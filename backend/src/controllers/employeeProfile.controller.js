const AnalyticsService = require('../services/analytics.service');
const prisma = require('../config/db');
const { saveBase64Media } = require('../services/photoStorage.service');

const EmployeeProfileController = {
  /**
   * Get complete employee profile with today's summary, activity breakdown, and historical trend analytics
   */
  getProfile: async (req, res) => {
    try {
      const { id } = req.params;
      const profile = await AnalyticsService.getEmployeeProfile(id);

      if (!profile) {
        return res.status(404).json({ success: false, error: 'Employee not found.' });
      }

      return res.json({
        success: true,
        data: profile,
      });
    } catch (error) {
      console.error('[PROFILE:GET_ERROR]', error);
      return res.status(500).json({ success: false, error: 'Failed to load employee profile.' });
    }
  },

  /**
   * Update Employee Profile (Personal Info, Department, Floor, Job Title, Photo)
   */
  updateProfile: async (req, res) => {
    try {
      const { id } = req.params;
      const { name, email, phone, jobTitle, departmentId, floorId, managerName, photoBase64 } = req.body;

      const employee = await prisma.employee.findUnique({ where: { id } });
      if (!employee) {
        return res.status(404).json({ success: false, error: 'Employee not found.' });
      }

      let photoUrl = employee.photoUrl;
      if (req.file) {
        photoUrl = `/uploads/profiles/${req.file.filename}`;
      } else if (photoBase64) {
        photoUrl = saveBase64Media(photoBase64, 'profiles') || photoUrl;
      }

      const updated = await prisma.employee.update({
        where: { id },
        data: {
          name: name ? name.trim() : employee.name,
          email: email !== undefined ? email : employee.email,
          phone: phone !== undefined ? phone : employee.phone,
          jobTitle: jobTitle !== undefined ? jobTitle : employee.jobTitle,
          departmentId: departmentId !== undefined ? departmentId : employee.departmentId,
          floorId: floorId !== undefined ? floorId : employee.floorId,
          managerName: managerName !== undefined ? managerName : employee.managerName,
          photoUrl,
        },
        include: {
          department: true,
          floor: true,
          section: true,
        },
      });

      return res.json({
        success: true,
        message: 'Employee profile updated successfully.',
        data: updated,
      });
    } catch (error) {
      console.error('[PROFILE:UPDATE_ERROR]', error);
      return res.status(500).json({ success: false, error: 'Failed to update employee profile.' });
    }
  },

  /**
   * Record Real-Time Activity Event (ACTIVE, IDLE, BREAK_START, CALL_START, MEETING_START)
   */
  recordActivity: async (req, res) => {
    try {
      const employeeId = req.user?.id || req.body.employeeId;
      const { eventType, durationSeconds = 0 } = req.body;

      if (!employeeId || !eventType) {
        return res.status(400).json({ success: false, error: 'Employee ID and eventType are required.' });
      }

      const event = await prisma.activityEvent.create({
        data: {
          employeeId,
          eventType,
          startedAt: new Date(),
          durationSeconds: parseInt(durationSeconds, 10) || 0,
        },
      });

      // Update today's attendance session last activity
      const today = new Date();
      const todayDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

      await prisma.attendanceSession.updateMany({
        where: { employeeId, date: todayDate },
        data: { lastActivity: new Date() },
      });

      return res.json({ success: true, event });
    } catch (error) {
      console.error('[ACTIVITY:RECORD_ERROR]', error);
      return res.status(500).json({ success: false, error: 'Failed to record activity event.' });
    }
  },
};

module.exports = EmployeeProfileController;
