const prisma = require('../config/db');
const { validateGeofence } = require('../services/geofence.service');

const GeofenceController = {
  /**
   * List all geofence zones
   */
  list: async (req, res) => {
    try {
      const sectionFilter = req.scopedSectionId || req.query.sectionId;
      const where = sectionFilter
        ? { OR: [{ sectionId: sectionFilter }, { sectionId: null }] }
        : {};

      const zones = await prisma.geofenceZone.findMany({
        where,
        include: { section: true },
        orderBy: { name: 'asc' },
      });

      return res.json({ success: true, data: zones });
    } catch (error) {
      console.error('[GEOFENCE:LIST_ERROR]', error);
      return res.status(500).json({ success: false, error: 'Failed to fetch geofence zones.' });
    }
  },

  /**
   * Create geofence zone
   */
  create: async (req, res) => {
    try {
      const { name, code, latitude, longitude, radiusMeters, sectionId } = req.body;

      if (!name || !code || latitude === undefined || longitude === undefined) {
        return res.status(400).json({
          success: false,
          error: 'name, code, latitude, and longitude are required.',
        });
      }

      const existing = await prisma.geofenceZone.findUnique({
        where: { code: code.trim() },
      });

      if (existing) {
        return res.status(409).json({
          success: false,
          error: `Geofence zone with code "${code}" already exists.`,
        });
      }

      const zone = await prisma.geofenceZone.create({
        data: {
          name: name.trim(),
          code: code.trim(),
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
          radiusMeters: radiusMeters ? parseFloat(radiusMeters) : 50.0,
          sectionId: sectionId || null,
        },
        include: { section: true },
      });

      return res.status(201).json({
        success: true,
        message: 'Geofence zone created successfully.',
        data: zone,
      });
    } catch (error) {
      console.error('[GEOFENCE:CREATE_ERROR]', error);
      return res.status(500).json({ success: false, error: 'Failed to create geofence zone.' });
    }
  },

  /**
   * Update geofence zone
   */
  update: async (req, res) => {
    try {
      const { id } = req.params;
      const { name, latitude, longitude, radiusMeters, isActive, sectionId } = req.body;

      const updateData = {};
      if (name) updateData.name = name.trim();
      if (latitude !== undefined) updateData.latitude = parseFloat(latitude);
      if (longitude !== undefined) updateData.longitude = parseFloat(longitude);
      if (radiusMeters !== undefined) updateData.radiusMeters = parseFloat(radiusMeters);
      if (isActive !== undefined) updateData.isActive = Boolean(isActive);
      if (sectionId !== undefined) updateData.sectionId = sectionId || null;

      const updated = await prisma.geofenceZone.update({
        where: { id },
        data: updateData,
        include: { section: true },
      });

      return res.json({
        success: true,
        message: 'Geofence zone updated successfully.',
        data: updated,
      });
    } catch (error) {
      console.error('[GEOFENCE:UPDATE_ERROR]', error);
      return res.status(500).json({ success: false, error: 'Failed to update geofence zone.' });
    }
  },

  /**
   * Delete geofence zone
   */
  delete: async (req, res) => {
    try {
      const { id } = req.params;
      await prisma.geofenceZone.delete({ where: { id } });

      return res.json({
        success: true,
        message: 'Geofence zone deleted successfully.',
      });
    } catch (error) {
      console.error('[GEOFENCE:DELETE_ERROR]', error);
      return res.status(500).json({ success: false, error: 'Failed to delete geofence zone.' });
    }
  },

  /**
   * Test/Validate client coordinates against active zones
   */
  validate: async (req, res) => {
    try {
      const { latitude, longitude, sectionId } = req.body;
      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);

      if (isNaN(lat) || isNaN(lng)) {
        return res.status(400).json({ success: false, error: 'Valid latitude and longitude required.' });
      }

      const result = await validateGeofence(lat, lng, sectionId || req.user?.sectionId);
      return res.json({ success: true, ...result });
    } catch (error) {
      console.error('[GEOFENCE:VALIDATE_ERROR]', error);
      return res.status(500).json({ success: false, error: 'Failed to validate coordinates.' });
    }
  },
};

module.exports = GeofenceController;
