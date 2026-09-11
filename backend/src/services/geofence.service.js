const { calculateDistanceMeters } = require('../utils/haversine');
const GeofenceZoneModel = require('../models/geofenceZone.model');

/**
 * Validates whether GPS coordinates are within an authorized geofence zone.
 * @param {number} latitude
 * @param {number} longitude
 * @param {string} sectionId (optional)
 * @returns {Promise<object>} Validation details
 */
async function validateGeofence(latitude, longitude, sectionId = null) {
  const activeZones = await GeofenceZoneModel.listActive(sectionId);

  if (!activeZones || activeZones.length === 0) {
    // If no geofence zone configured, permit with warning
    return {
      isValid: true,
      status: 'INSIDE',
      nearestZone: null,
      distanceMeters: 0,
      breachMeters: 0,
      message: 'No geofence restrictions currently configured.',
    };
  }

  let minDistance = Infinity;
  let nearestZone = null;
  let isInsideAny = false;

  for (const zone of activeZones) {
    const dist = calculateDistanceMeters(latitude, longitude, zone.latitude, zone.longitude);
    if (dist < minDistance) {
      minDistance = dist;
      nearestZone = zone;
    }

    if (dist <= zone.radiusMeters) {
      isInsideAny = true;
      // If inside this zone, we can prioritize it
      nearestZone = zone;
      break;
    }
  }

  const allowableRadius = nearestZone ? nearestZone.radiusMeters : 50;
  const breachMeters = isInsideAny ? 0 : Math.max(0, Math.round(minDistance - allowableRadius));

  return {
    isValid: isInsideAny,
    status: isInsideAny ? 'INSIDE' : 'OUTSIDE',
    nearestZone: nearestZone
      ? {
          id: nearestZone.id,
          name: nearestZone.name,
          code: nearestZone.code,
          radiusMeters: nearestZone.radiusMeters,
          latitude: nearestZone.latitude,
          longitude: nearestZone.longitude,
        }
      : null,
    distanceMeters: Math.round(minDistance * 10) / 10,
    allowableRadius,
    breachMeters,
    message: isInsideAny
      ? `Within ${nearestZone?.name || 'authorized zone'} perimeter.`
      : `Geofence breach! Device is ${breachMeters}m outside authorized perimeter.`,
  };
}

module.exports = {
  validateGeofence,
};
