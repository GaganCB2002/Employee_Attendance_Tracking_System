/**
 * Input validators for AttendX
 */

function isValidCoordinate(lat, lng) {
  const latitude = parseFloat(lat);
  const longitude = parseFloat(lng);
  return (
    !isNaN(latitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    !isNaN(longitude) &&
    longitude >= -180 &&
    longitude <= 180
  );
}

function isValidTimeFormat(str) {
  if (typeof str !== 'string') return false;
  const regex = /^([01]\d|2[0-3]):([0-5]\d)$/;
  return regex.test(str);
}

function sanitizeString(str) {
  return typeof str === 'string' ? str.trim() : '';
}

module.exports = {
  isValidCoordinate,
  isValidTimeFormat,
  sanitizeString,
};
