const express = require('express');
const router = express.Router();
const ReportsController = require('../controllers/reports.controller');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.get('/', ReportsController.getReportData);
router.get('/export/csv', ReportsController.exportCsv);

module.exports = router;
