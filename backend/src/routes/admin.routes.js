const express = require('express');
const router = express.Router();
const AdminController = require('../controllers/admin.controller');
const authMiddleware = require('../middleware/authMiddleware');
const { requireAdmin, enforceSectionScope } = require('../middleware/roleMiddleware');

router.use(authMiddleware);
router.use(requireAdmin);

// Dashboard aggregates
router.get('/aggregates', enforceSectionScope, AdminController.getDashboardAggregates);

// Security lockouts
router.get('/lockouts', enforceSectionScope, AdminController.getLockouts);
router.post('/unlock/:id', enforceSectionScope, AdminController.unlockUser);

// Audit logs
router.get('/audit', AdminController.getAuditTrail);

// Metadata (sections, shifts, checkpoints)
router.get('/metadata', AdminController.getMetadata);

module.exports = router;
