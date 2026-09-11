const express = require('express');
const router = express.Router();
const EmployeeController = require('../controllers/employee.controller');
const EmployeeProfileController = require('../controllers/employeeProfile.controller');
const authMiddleware = require('../middleware/authMiddleware');
const { requireAdmin, enforceSectionScope } = require('../middleware/roleMiddleware');
const { upload } = require('../services/photoStorage.service');

// All employee routes require authentication
router.use(authMiddleware);

// Record employee activity event (accessible by employee & admin)
router.post('/activity', EmployeeProfileController.recordActivity);

// Detailed employee profile & analytics
router.get('/:id/profile', EmployeeProfileController.getProfile);
router.put('/:id/profile', upload.single('photo'), EmployeeProfileController.updateProfile);

// Employee Management routes require Admin privileges
router.use(requireAdmin);

// List employees with section scoping
router.get('/', enforceSectionScope, EmployeeController.list);

// Get single employee
router.get('/:id', EmployeeController.getById);

// Onboard new employee (with optional photo upload)
router.post('/', enforceSectionScope, upload.single('photo'), EmployeeController.create);

// Update employee
router.put('/:id', enforceSectionScope, upload.single('photo'), EmployeeController.update);

// Unlock account (remediation for 3-strike lockout)
router.post('/:id/unlock', enforceSectionScope, EmployeeController.unlock);

module.exports = router;
