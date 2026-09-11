const prisma = require('../config/db');

const SettingsController = {
  /**
   * Get Activity Rules & Thresholds
   */
  getActivityRules: async (req, res) => {
    try {
      const setting = await prisma.systemSetting.findUnique({
        where: { key: 'activity_rules' },
      });

      const rules = setting?.value || {
        workStartTime: '09:00',
        workEndTime: '18:00',
        idleThresholdMinutes: 10,
        longIdleThresholdMinutes: 30,
        breakLimitMinutes: 15,
        longBreakThresholdMinutes: 30,
        lateThresholdTime: '09:15',
        callWarningMinutes: 30,
        timezone: 'Asia/Kolkata',
      };

      return res.json({ success: true, rules });
    } catch (error) {
      return res.status(500).json({ success: false, error: 'Failed to fetch activity rules.' });
    }
  },

  /**
   * Update Activity Rules & Thresholds
   */
  updateActivityRules: async (req, res) => {
    try {
      const {
        workStartTime,
        workEndTime,
        idleThresholdMinutes,
        longIdleThresholdMinutes,
        breakLimitMinutes,
        longBreakThresholdMinutes,
        lateThresholdTime,
        callWarningMinutes,
        timezone,
      } = req.body;

      const newRules = {
        workStartTime: workStartTime || '09:00',
        workEndTime: workEndTime || '18:00',
        idleThresholdMinutes: parseInt(idleThresholdMinutes, 10) || 10,
        longIdleThresholdMinutes: parseInt(longIdleThresholdMinutes, 10) || 30,
        breakLimitMinutes: parseInt(breakLimitMinutes, 10) || 15,
        longBreakThresholdMinutes: parseInt(longBreakThresholdMinutes, 10) || 30,
        lateThresholdTime: lateThresholdTime || '09:15',
        callWarningMinutes: parseInt(callWarningMinutes, 10) || 30,
        timezone: timezone || 'Asia/Kolkata',
      };

      const setting = await prisma.systemSetting.upsert({
        where: { key: 'activity_rules' },
        update: { value: newRules, updatedBy: req.user?.username || 'admin' },
        create: { key: 'activity_rules', value: newRules, updatedBy: req.user?.username || 'admin' },
      });

      return res.json({ success: true, message: 'Activity rules updated.', rules: setting.value });
    } catch (error) {
      return res.status(500).json({ success: false, error: 'Failed to update activity rules.' });
    }
  },

  /**
   * Get Project-Wide Theme Tokens
   */
  getThemeTokens: async (req, res) => {
    try {
      const setting = await prisma.systemSetting.findUnique({
        where: { key: 'theme_tokens' },
      });

      const theme = setting?.value || {
        mode: 'dark',
        preset: 'Professional Blue',
        primary: '#2563eb',
        secondary: '#60a5fa',
        accent: '#38bdf8',
        background: '#0b1329',
        surface: '#152140',
        sidebar: '#090f20',
        header: '#0b1329',
        text: '#f8fafc',
        mutedText: '#94a3b8',
        success: '#10b981',
        warning: '#f59e0b',
        danger: '#ef4444',
        info: '#3b82f6',
        border: '#1e293b',
      };

      return res.json({ success: true, theme });
    } catch (error) {
      return res.status(500).json({ success: false, error: 'Failed to fetch theme settings.' });
    }
  },

  /**
   * Save Project-Wide Theme Tokens
   */
  updateThemeTokens: async (req, res) => {
    try {
      const theme = req.body;
      const setting = await prisma.systemSetting.upsert({
        where: { key: 'theme_tokens' },
        update: { value: theme, updatedBy: req.user?.username || 'admin' },
        create: { key: 'theme_tokens', value: theme, updatedBy: req.user?.username || 'admin' },
      });

      return res.json({ success: true, message: 'Project theme updated successfully.', theme: setting.value });
    } catch (error) {
      return res.status(500).json({ success: false, error: 'Failed to save theme settings.' });
    }
  },
};

module.exports = SettingsController;
