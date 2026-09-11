const AnalyticsService = require('../services/analytics.service');
const prisma = require('../config/db');

const LiveTvController = {
  /**
   * Main Live TV Monitoring Overview Endpoint
   * Returns real-time summary counts, ratios, department segregation, floor segregation, and employee roster
   */
  getOverview: async (req, res) => {
    try {
      const data = await AnalyticsService.getLiveTvOverview();
      return res.json({
        success: true,
        data,
      });
    } catch (error) {
      console.error('[LIVETV:OVERVIEW_ERROR]', error);
      return res.status(500).json({ success: false, error: 'Failed to retrieve Live TV monitoring data.' });
    }
  },

  /**
   * Quick Realtime Statistics & Ratios
   */
  getStatistics: async (req, res) => {
    try {
      const data = await AnalyticsService.getLiveTvOverview();
      return res.json({
        success: true,
        summary: data.summary,
        ratios: data.ratios,
        timestamp: data.timestamp,
      });
    } catch (error) {
      return res.status(500).json({ success: false, error: 'Failed to retrieve Live TV statistics.' });
    }
  },

  /**
   * Active Live Alerts
   */
  getAlerts: async (req, res) => {
    try {
      const alerts = await prisma.liveAlert.findMany({
        where: { isRead: false },
        orderBy: { createdAt: 'desc' },
        take: 20,
      });
      return res.json({ success: true, alerts });
    } catch (error) {
      return res.status(500).json({ success: false, error: 'Failed to load alerts.' });
    }
  },

  /**
   * Dismiss an alert
   */
  dismissAlert: async (req, res) => {
    try {
      const { id } = req.params;
      await prisma.liveAlert.update({
        where: { id },
        data: { isRead: true },
      });
      return res.json({ success: true, message: 'Alert dismissed.' });
    } catch (error) {
      return res.status(500).json({ success: false, error: 'Failed to dismiss alert.' });
    }
  },
};

module.exports = LiveTvController;
