const express = require('express');
const router = express.Router();
const LiveTvController = require('../controllers/liveTv.controller');
const authMiddleware = require('../middleware/authMiddleware');

// Live TV monitoring routes
router.use(authMiddleware);

router.get('/', LiveTvController.getOverview);
router.get('/statistics', LiveTvController.getStatistics);
router.get('/alerts', LiveTvController.getAlerts);
router.post('/alerts/:id/dismiss', LiveTvController.dismissAlert);

module.exports = router;
