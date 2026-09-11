/**
 * Service to evaluate late arrival against shift start time + grace period.
 */

function parseTimeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const parts = timeStr.split(':');
  const hours = parseInt(parts[0], 10) || 0;
  const minutes = parseInt(parts[1], 10) || 0;
  return hours * 60 + minutes;
}

/**
 * Evaluates whether a sign-in is ON_TIME or LATE.
 * @param {Date|string} actualDateTime The timestamp when sign in occurred
 * @param {string} shiftStartTime 24-hr format "HH:mm" e.g. "06:00" or "10:30"
 * @param {number} gracePeriodMinutes Grace minutes allowed e.g. 15
 * @returns {object} { isLate: boolean, status: 'LATE' | 'ON_TIME', deltaMinutes: number, expectedTime: string }
 */
function evaluateLateArrival(actualDateTime, shiftStartTime, gracePeriodMinutes = 15) {
  const actualDate = new Date(actualDateTime);
  const actualMinutes = actualDate.getHours() * 60 + actualDate.getMinutes();
  const shiftMinutes = parseTimeToMinutes(shiftStartTime);
  const allowedCutoff = shiftMinutes + gracePeriodMinutes;

  const deltaMinutes = actualMinutes - shiftMinutes;
  const isLate = actualMinutes > allowedCutoff;

  return {
    isLate,
    status: isLate ? 'LATE' : 'ON_TIME',
    deltaMinutes,
    scheduledStartTime: shiftStartTime,
    gracePeriodMinutes,
    cutoffMinutes: allowedCutoff,
  };
}

module.exports = {
  evaluateLateArrival,
  parseTimeToMinutes,
};
