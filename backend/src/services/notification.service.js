/**
 * Notification and Operational Alert Service
 */

const NotificationService = {
  sendLateArrivalAlert: async ({ employee, shift, deltaMinutes, photoUrl }) => {
    console.log(
      `[ALERT:LATE] Employee ${employee.name} (${employee.employeeCode}) clocked in ${deltaMinutes}m late for shift ${shift.name}.`
    );
    return { success: true, deliveredAt: new Date() };
  },

  sendGeofenceBreachAlert: async ({ employee, breachMeters, distanceMeters, lat, lng }) => {
    console.warn(
      `[ALERT:BREACH] Geofence violation by ${employee.name} (${employee.employeeCode}): ${breachMeters}m outside perimeter (Coords: ${lat}, ${lng}).`
    );
    return { success: true, deliveredAt: new Date() };
  },

  sendLockoutAlert: async ({ identifier, userType, ipAddress }) => {
    console.error(
      `[SECURITY:LOCKOUT] Account locked for ${userType} "${identifier}" after 3 consecutive failed attempts from IP ${ipAddress}.`
    );
    return { success: true, deliveredAt: new Date() };
  },

  sendUnlockNotification: async ({ employee, unlockedBy }) => {
    console.log(
      `[SECURITY:UNLOCK] Account ${employee.employeeCode} successfully restored by admin ${unlockedBy}.`
    );
    return { success: true, deliveredAt: new Date() };
  },
};

module.exports = NotificationService;
