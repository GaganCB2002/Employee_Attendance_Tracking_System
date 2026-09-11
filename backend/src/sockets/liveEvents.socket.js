const jwt = require('jsonwebtoken');
const config = require('../config/env');

let ioInstance = null;

function setupLiveEventsSocket(io) {
  ioInstance = io;

  // Socket middleware for authentication
  io.use((socket, next) => {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.replace('Bearer ', '') ||
      socket.handshake.query?.token;

    if (!token) {
      // Allow anonymous ops dashboard read-only or reject
      socket.user = { role: 'GUEST_OPS' };
      return next();
    }

    try {
      const decoded = jwt.verify(token, config.jwtSecret);
      socket.user = decoded;
      return next();
    } catch (err) {
      // Invalid token, default to guest or reject
      socket.user = { role: 'GUEST_OPS' };
      return next();
    }
  });

  io.on('connection', (socket) => {
    const userRole = socket.user?.role || 'ANONYMOUS';
    console.log(`[SOCKET] Admin/Client connected: ${socket.id} (Role: ${userRole})`);

    // Join general ops stream
    socket.join('ops-telemetry');

    // If section admin, join section specific room
    if (socket.user?.sectionId) {
      socket.join(`section-${socket.user.sectionId}`);
    }

    // Ping / telemetry response
    socket.on('telemetry:ping', (data) => {
      socket.emit('telemetry:pong', {
        serverTime: new Date().toISOString(),
        clientSent: data?.time,
        activeClients: io.engine.clientsCount,
      });
    });

    socket.on('disconnect', () => {
      // Clean disconnect
    });
  });

  return io;
}

/**
 * Broadcasts a new attendance record to connected admin dashboards in real time.
 */
function broadcastAttendanceRecord(record) {
  if (!ioInstance) return;

  const payload = {
    type: 'ATTENDANCE_RECORD',
    record,
    timestamp: new Date().toISOString(),
  };

  // Broadcast to global ops room
  ioInstance.to('ops-telemetry').emit('attendance:new', payload);

  // If record has an employee section, broadcast to section room as well
  const sectionId = record.employee?.sectionId || record.employee?.section?.id;
  if (sectionId) {
    ioInstance.to(`section-${sectionId}`).emit('attendance:new', payload);
  }
}

/**
 * Broadcasts security lockout event immediately to admin ops
 */
function broadcastLockoutEvent(event) {
  if (!ioInstance) return;
  ioInstance.to('ops-telemetry').emit('security:lockout', {
    ...event,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Broadcasts geofence breach alert to admin ops
 */
function broadcastBreachAlert(alert) {
  if (!ioInstance) return;
  ioInstance.to('ops-telemetry').emit('geofence:breach', {
    ...alert,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Broadcasts general dashboard stats re-computation
 */
function broadcastStatsUpdate(stats) {
  if (!ioInstance) return;
  ioInstance.to('ops-telemetry').emit('stats:update', stats);
}

module.exports = {
  setupLiveEventsSocket,
  broadcastAttendanceRecord,
  broadcastLockoutEvent,
  broadcastBreachAlert,
  broadcastStatsUpdate,
};
