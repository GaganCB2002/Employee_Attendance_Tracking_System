const bcrypt = require('bcryptjs');
const prisma = require('../config/db');
const { saveBase64Media } = require('../services/photoStorage.service');
const NotificationService = require('../services/notification.service');

const EmployeeController = {
  /**
   * List all employees with section-scoping enforcement
   */
  list: async (req, res) => {
    try {
      const sectionFilter = req.scopedSectionId || req.query.sectionId;
      const where = {};

      if (sectionFilter) {
        where.sectionId = sectionFilter;
      }

      if (req.query.status) {
        where.status = req.query.status;
      }

      if (req.query.search) {
        const term = req.query.search.trim();
        where.OR = [
          { name: { contains: term, mode: 'insensitive' } },
          { employeeCode: { contains: term, mode: 'insensitive' } },
          { email: { contains: term, mode: 'insensitive' } },
        ];
      }

      const employees = await prisma.employee.findMany({
        where,
        include: {
          section: true,
          shift: {
            include: {
              checkpoints: { orderBy: { sequenceOrder: 'asc' } },
            },
          },
        },
        orderBy: { name: 'asc' },
      });

      return res.json({
        success: true,
        count: employees.length,
        data: employees,
      });
    } catch (error) {
      console.error('[EMPLOYEE:LIST_ERROR]', error);
      return res.status(500).json({ success: false, error: 'Failed to retrieve employees.' });
    }
  },

  /**
   * Get employee by ID
   */
  getById: async (req, res) => {
    try {
      const { id } = req.params;
      const employee = await prisma.employee.findUnique({
        where: { id },
        include: {
          section: true,
          shift: {
            include: {
              checkpoints: { orderBy: { sequenceOrder: 'asc' } },
            },
          },
        },
      });

      if (!employee) {
        return res.status(404).json({ success: false, error: 'Employee not found.' });
      }

      // Check section scoping
      if (req.user.role === 'SECTION_ADMIN' && employee.sectionId !== req.user.sectionId) {
        return res.status(403).json({
          success: false,
          error: 'Access denied: Employee belongs to a different section.',
        });
      }

      return res.json({ success: true, data: employee });
    } catch (error) {
      console.error('[EMPLOYEE:GET_ERROR]', error);
      return res.status(500).json({ success: false, error: 'Failed to retrieve employee.' });
    }
  },

  /**
   * Onboard new employee with photo, section, and shift
   */
  create: async (req, res) => {
    try {
      const { employeeCode, name, email, phone, sectionId, shiftId, password, photoBase64 } = req.body;

      if (!employeeCode || !name || !sectionId || !shiftId || !password) {
        return res.status(400).json({
          success: false,
          error: 'employeeCode, name, sectionId, shiftId, and password are required.',
        });
      }

      // Enforce section scoping for Section Admins
      if (req.user.role === 'SECTION_ADMIN' && sectionId !== req.user.sectionId) {
        return res.status(403).json({
          success: false,
          error: 'Section Admins may only onboard employees to their own section.',
        });
      }

      // Check duplicate employee code
      const existing = await prisma.employee.findUnique({
        where: { employeeCode: employeeCode.trim() },
      });

      if (existing) {
        return res.status(409).json({
          success: false,
          error: `Employee ID "${employeeCode}" is already registered.`,
        });
      }

      // Save photo if uploaded as file or base64
      let photoUrl = null;
      if (req.file) {
        photoUrl = `/uploads/profiles/${req.file.filename}`;
      } else if (photoBase64) {
        photoUrl = saveBase64Media(photoBase64, 'profiles');
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);

      const newEmployee = await prisma.employee.create({
        data: {
          employeeCode: employeeCode.trim(),
          name: name.trim(),
          email: email ? email.trim() : null,
          phone: phone ? phone.trim() : null,
          passwordHash,
          photoUrl,
          sectionId,
          shiftId,
          status: 'ACTIVE',
        },
        include: {
          section: true,
          shift: true,
        },
      });

      // Audit Log
      await prisma.auditLog.create({
        data: {
          action: 'EMPLOYEE_ONBOARDED',
          entityType: 'Employee',
          entityId: newEmployee.id,
          actorId: req.user.id,
          actorRole: req.user.role,
          details: {
            employeeCode: newEmployee.employeeCode,
            name: newEmployee.name,
            section: newEmployee.section?.name,
          },
        },
      });

      return res.status(201).json({
        success: true,
        message: 'Employee onboarded successfully.',
        data: newEmployee,
      });
    } catch (error) {
      console.error('[EMPLOYEE:CREATE_ERROR]', error);
      return res.status(500).json({ success: false, error: 'Failed to onboard employee.' });
    }
  },

  /**
   * Update employee details / reassign section or shift
   */
  update: async (req, res) => {
    try {
      const { id } = req.params;
      const { name, email, phone, sectionId, shiftId, status, password, photoBase64 } = req.body;

      const employee = await prisma.employee.findUnique({ where: { id } });
      if (!employee) {
        return res.status(404).json({ success: false, error: 'Employee not found.' });
      }

      // Scoping check
      if (req.user.role === 'SECTION_ADMIN' && employee.sectionId !== req.user.sectionId) {
        return res.status(403).json({ success: false, error: 'Access denied: Employee is in another section.' });
      }

      const updateData = {};
      if (name) updateData.name = name.trim();
      if (email !== undefined) updateData.email = email ? email.trim() : null;
      if (phone !== undefined) updateData.phone = phone ? phone.trim() : null;
      if (shiftId) updateData.shiftId = shiftId;
      if (status) updateData.status = status;

      // Only Super Admin can change section
      if (sectionId && sectionId !== employee.sectionId) {
        if (req.user.role !== 'SUPER_ADMIN') {
          return res.status(403).json({ success: false, error: 'Only Super Admin can reassign employee sections.' });
        }
        updateData.sectionId = sectionId;
      }

      if (password) {
        updateData.passwordHash = await bcrypt.hash(password, 10);
      }

      if (req.file) {
        updateData.photoUrl = `/uploads/profiles/${req.file.filename}`;
      } else if (photoBase64) {
        updateData.photoUrl = saveBase64Media(photoBase64, 'profiles');
      }

      const updated = await prisma.employee.update({
        where: { id },
        data: updateData,
        include: { section: true, shift: true },
      });

      return res.json({
        success: true,
        message: 'Employee record updated successfully.',
        data: updated,
      });
    } catch (error) {
      console.error('[EMPLOYEE:UPDATE_ERROR]', error);
      return res.status(500).json({ success: false, error: 'Failed to update employee.' });
    }
  },

  /**
   * Unlock a locked account (3-strike lockout remediation)
   */
  unlock: async (req, res) => {
    try {
      const { id } = req.params;
      const employee = await prisma.employee.findUnique({
        where: { id },
        include: { section: true },
      });

      if (!employee) {
        return res.status(404).json({ success: false, error: 'Employee not found.' });
      }

      // Check section scoping
      if (req.user.role === 'SECTION_ADMIN' && employee.sectionId !== req.user.sectionId) {
        return res.status(403).json({
          success: false,
          error: 'Section Admin can only unlock employees in their own section.',
        });
      }

      const unlocked = await prisma.employee.update({
        where: { id },
        data: {
          status: 'ACTIVE',
          failedAttempts: 0,
          lockedAt: null,
          lockReason: null,
        },
      });

      await NotificationService.sendUnlockNotification({
        employee: unlocked,
        unlockedBy: req.user.username || req.user.name,
      });

      // Audit Log
      await prisma.auditLog.create({
        data: {
          action: 'ACCOUNT_UNLOCKED',
          entityType: 'Employee',
          entityId: unlocked.id,
          actorId: req.user.id,
          actorRole: req.user.role,
          details: {
            employeeCode: unlocked.employeeCode,
            unlockedBy: req.user.name,
            timestamp: new Date().toISOString(),
          },
        },
      });

      return res.json({
        success: true,
        message: `Account for ${unlocked.name} (${unlocked.employeeCode}) has been unlocked.`,
        data: unlocked,
      });
    } catch (error) {
      console.error('[EMPLOYEE:UNLOCK_ERROR]', error);
      return res.status(500).json({ success: false, error: 'Failed to unlock employee account.' });
    }
  },
};

module.exports = EmployeeController;
