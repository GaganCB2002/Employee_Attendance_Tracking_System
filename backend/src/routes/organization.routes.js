const express = require('express');
const router = express.Router();
const OrganizationController = require('../controllers/organization.controller');
const authMiddleware = require('../middleware/authMiddleware');
const { requireSuperAdmin } = require('../middleware/roleMiddleware');

router.use(authMiddleware);

// Departments
router.get('/departments', OrganizationController.listDepartments);
router.post('/departments', requireSuperAdmin, OrganizationController.createDepartment);
router.put('/departments/:id', requireSuperAdmin, OrganizationController.updateDepartment);

// Floors
router.get('/floors', OrganizationController.listFloors);
router.post('/floors', requireSuperAdmin, OrganizationController.createFloor);
router.put('/floors/:id', requireSuperAdmin, OrganizationController.updateFloor);

module.exports = router;
