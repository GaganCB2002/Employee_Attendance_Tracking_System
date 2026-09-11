const express = require('express');
const router = express.Router();
const SettingsController = require('../controllers/settings.controller');
const authMiddleware = require('../middleware/authMiddleware');
const { requireSuperAdmin } = require('../middleware/roleMiddleware');

router.use(authMiddleware);

// Activity Rules & Thresholds
router.get('/activity-rules', SettingsController.getActivityRules);
router.put('/activity-rules', requireSuperAdmin, SettingsController.updateActivityRules);

// Centralized Theme Tokens
router.get('/theme', SettingsController.getThemeTokens);
router.put('/theme', requireSuperAdmin, SettingsController.updateThemeTokens);

module.exports = router;
