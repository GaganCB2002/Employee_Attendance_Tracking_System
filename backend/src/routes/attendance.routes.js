const express = require('express');
const router = express.Router();
const AttendanceController = require('../controllers/attendance.controller');
const CheckpointController = require('../controllers/checkpoint.controller');
const authMiddleware = require('../middleware/authMiddleware');
const { requireAdmin, enforceSectionScope } = require('../middleware/roleMiddleware');
const { upload } = require('../services/photoStorage.service');
const { checkpointRateLimiter } = require('../middleware/rateLimiter.middleware');
const deviceCheckMiddleware = require('../middleware/deviceCheck.middleware');
const { validateSchema, SCHEMAS } = require('../middleware/validate.middleware');

// All attendance actions require authentication
router.use(authMiddleware);

// Employee Checkpoint Actions
router.get('/status', CheckpointController.getStatus);
router.post(
  '/checkpoint',
  checkpointRateLimiter,
  upload.single('photo'),
  validateSchema(SCHEMAS.checkpointSubmit),
  deviceCheckMiddleware,
  CheckpointController.submit
);
router.get('/my', AttendanceController.getMyRecords);

// Exit Security Verification & Breach Handling
router.post('/verify-exit-code', CheckpointController.verifyExitCode);
router.post('/security-breach', CheckpointController.recordSecurityBreach);

// Admin & Ops Views
router.get('/', requireAdmin, enforceSectionScope, AttendanceController.list);
router.get('/folder', requireAdmin, enforceSectionScope, AttendanceController.getFolderView);
router.post('/:id/approve', requireAdmin, AttendanceController.approveException);

module.exports = router;
