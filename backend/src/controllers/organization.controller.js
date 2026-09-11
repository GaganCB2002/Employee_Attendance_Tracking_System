const prisma = require('../config/db');

const OrganizationController = {
  // --- Departments ---
  listDepartments: async (req, res) => {
    try {
      const departments = await prisma.department.findMany({
        include: {
          _count: { select: { employees: true } },
        },
        orderBy: { name: 'asc' },
      });
      return res.json({ success: true, departments });
    } catch (error) {
      return res.status(500).json({ success: false, error: 'Failed to fetch departments.' });
    }
  },

  createDepartment: async (req, res) => {
    try {
      const { name, code, description, managerName } = req.body;
      if (!name || !code) {
        return res.status(400).json({ success: false, error: 'Department name and code are required.' });
      }

      const dept = await prisma.department.create({
        data: {
          name: name.trim(),
          code: code.trim().toUpperCase(),
          description: description?.trim(),
          managerName: managerName?.trim(),
        },
      });

      return res.status(201).json({ success: true, department: dept });
    } catch (error) {
      if (error.code === 'P2002') {
        return res.status(400).json({ success: false, error: 'Department with this code or name already exists.' });
      }
      return res.status(500).json({ success: false, error: 'Failed to create department.' });
    }
  },

  updateDepartment: async (req, res) => {
    try {
      const { id } = req.params;
      const { name, description, managerName } = req.body;

      const updated = await prisma.department.update({
        where: { id },
        data: {
          name: name?.trim(),
          description: description?.trim(),
          managerName: managerName?.trim(),
        },
      });

      return res.json({ success: true, department: updated });
    } catch (error) {
      return res.status(500).json({ success: false, error: 'Failed to update department.' });
    }
  },

  // --- Floors ---
  listFloors: async (req, res) => {
    try {
      const floors = await prisma.floor.findMany({
        include: {
          _count: { select: { employees: true } },
        },
        orderBy: { level: 'asc' },
      });
      return res.json({ success: true, floors });
    } catch (error) {
      return res.status(500).json({ success: false, error: 'Failed to fetch floors.' });
    }
  },

  createFloor: async (req, res) => {
    try {
      const { name, code, level, description } = req.body;
      if (!name || !code) {
        return res.status(400).json({ success: false, error: 'Floor name and code are required.' });
      }

      const floor = await prisma.floor.create({
        data: {
          name: name.trim(),
          code: code.trim().toUpperCase(),
          level: parseInt(level, 10) || 0,
          description: description?.trim(),
        },
      });

      return res.status(201).json({ success: true, floor });
    } catch (error) {
      if (error.code === 'P2002') {
        return res.status(400).json({ success: false, error: 'Floor with this code or name already exists.' });
      }
      return res.status(500).json({ success: false, error: 'Failed to create floor.' });
    }
  },

  updateFloor: async (req, res) => {
    try {
      const { id } = req.params;
      const { name, level, description } = req.body;

      const updated = await prisma.floor.update({
        where: { id },
        data: {
          name: name?.trim(),
          level: level !== undefined ? parseInt(level, 10) : undefined,
          description: description?.trim(),
        },
      });

      return res.json({ success: true, floor: updated });
    } catch (error) {
      return res.status(500).json({ success: false, error: 'Failed to update floor.' });
    }
  },
};

module.exports = OrganizationController;
