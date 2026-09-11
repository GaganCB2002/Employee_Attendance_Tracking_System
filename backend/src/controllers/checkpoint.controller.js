const prisma = require('../config/db');
const { validateGeofence } = require('../services/geofence.service');
const { evaluateLateArrival } = require('../services/lateDetection.service');
const { saveBase64Media } = require('../services/photoStorage.service');
const NotificationService = require('../services/notification.service');
const { broadcastAttendanceRecord, broadcastBreachAlert } = require('../sockets/liveEvents.socket');

function getTodayString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const CheckpointController = {
  /**
   * Get employee shift status, progress, and next expected checkpoint
   */
  getStatus: async (req, res) => {
    try {
      const employeeId = req.user.id;
      const todayDate = getTodayString();

      const employee = await prisma.employee.findUnique({
        where: { id: employeeId },
        include: {
          section: true,
          shift: {
            include: {
              checkpoints: { orderBy: { sequenceOrder: 'asc' } },
            },
          },
        },
      });

      if (!employee) {
        return res.status(404).json({ success: false, error: 'Employee not found.' });
      }

      // Checkpoints already completed today
      const todayRecords = await prisma.attendanceRecord.findMany({
        where: {
          employeeId,
          date: todayDate,
        },
        include: {
          checkpoint: true,
        },
        orderBy: { actualTime: 'asc' },
      });

      const completedCheckpointIds = new Set(todayRecords.map((r) => r.checkpointId));
      const shiftCheckpoints = employee.shift?.checkpoints || [];

      // Find next expected checkpoint (first uncompleted in order)
      const nextExpected = shiftCheckpoints.find((cp) => !completedCheckpointIds.has(cp.id)) || null;

      return res.json({
        success: true,
        employee: {
          id: employee.id,
          employeeCode: employee.employeeCode,
          name: employee.name,
          section: employee.section?.name,
          shift: employee.shift?.name,
          photoUrl: employee.photoUrl,
        },
        shift: employee.shift,
        allCheckpoints: shiftCheckpoints,
        completedRecords: todayRecords,
        completedCount: completedCheckpointIds.size,
        totalCount: shiftCheckpoints.length,
        nextCheckpoint: nextExpected,
        isShiftComplete: completedCheckpointIds.size >= shiftCheckpoints.length && shiftCheckpoints.length > 0,
      });
    } catch (error) {
      console.error('[CHECKPOINT:STATUS_ERROR]', error);
      return res.status(500).json({ success: false, error: 'Failed to fetch checkpoint status.' });
    }
  },

  /**
   * Submit Checkpoint Action (Photo + GPS + Sequence Verification)
   */
  submit: async (req, res) => {
    try {
      const employeeId = req.user.id;
      const { checkpointId, latitude, longitude, accuracy, photoBase64, livenessScore, notes } = req.body;
      const todayDate = getTodayString();
      const actualTime = new Date();

      // (A) REQUIRE PHOTO VERIFICATION
      let photoUrl = null;
      if (req.file) {
        photoUrl = `/uploads/checkpoints/${req.file.filename}`;
      } else if (photoBase64) {
        photoUrl = saveBase64Media(photoBase64, 'checkpoints');
      }

      if (!photoUrl) {
        return res.status(400).json({
          success: false,
          error: 'Photo verification is mandatory. Camera capture failed or was missing.',
        });
      }

      // Validate employee and shift
      const employee = await prisma.employee.findUnique({
        where: { id: employeeId },
        include: {
          section: true,
          shift: {
            include: {
              checkpoints: { orderBy: { sequenceOrder: 'asc' } },
            },
          },
        },
      });

      if (!employee || !employee.shift) {
        return res.status(400).json({ success: false, error: 'Employee or assigned shift not found.' });
      }

      const shift = employee.shift;
      const shiftCheckpoints = shift.checkpoints || [];

      // Validate checkpoint requested
      const targetCheckpoint = shiftCheckpoints.find((cp) => cp.id === checkpointId);
      if (!targetCheckpoint) {
        return res.status(404).json({ success: false, error: 'Checkpoint does not belong to your shift.' });
      }

      // (C) CHECK SEQUENCE ENFORCEMENT
      const completedToday = await prisma.attendanceRecord.findMany({
        where: { employeeId, date: todayDate },
        include: { checkpoint: true },
        orderBy: { actualTime: 'asc' },
      });

      const completedIds = new Set(completedToday.map((r) => r.checkpointId));
      if (completedIds.has(targetCheckpoint.id)) {
        return res.status(400).json({
          success: false,
          error: `Checkpoint "${targetCheckpoint.name}" has already been completed today.`,
        });
      }

      // Ensure all previous checkpoints in sequence are completed
      const priorCheckpoints = shiftCheckpoints.filter((cp) => cp.sequenceOrder < targetCheckpoint.sequenceOrder);
      const missingPrior = priorCheckpoints.find((cp) => !completedIds.has(cp.id));

      if (missingPrior) {
        return res.status(400).json({
          success: false,
          error: `Sequence violation: You must complete "${missingPrior.name}" (Step ${missingPrior.sequenceOrder}) before "${targetCheckpoint.name}".`,
          expectedStep: missingPrior.sequenceOrder,
          expectedName: missingPrior.name,
        });
      }

      // (B) GPS GEOFENCE VALIDATION
      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);
      const gpsAcc = parseFloat(accuracy || 2.0);

      if (isNaN(lat) || isNaN(lng)) {
        return res.status(400).json({
          success: false,
          error: 'GPS location coordinates are required for checkpoint submission.',
        });
      }

      const geofenceResult = await validateGeofence(lat, lng, employee.sectionId);

      if (!geofenceResult.isValid) {
        // Log breach alert & geofence audit
        await NotificationService.sendGeofenceBreachAlert({
          employee,
          breachMeters: geofenceResult.breachMeters,
          distanceMeters: geofenceResult.distanceMeters,
          lat,
          lng,
        });

        broadcastBreachAlert({
          employeeId: employee.id,
          employeeCode: employee.employeeCode,
          name: employee.name,
          section: employee.section?.name,
          breachMeters: geofenceResult.breachMeters,
          time: actualTime.toISOString(),
          lat,
          lng,
        });

        return res.status(403).json({
          success: false,
          error: `Outside authorized office geofence (${geofenceResult.breachMeters}m perimeter breach). Submission rejected.`,
          breachMeters: geofenceResult.breachMeters,
          distanceMeters: geofenceResult.distanceMeters,
          nearestZone: geofenceResult.nearestZone?.name,
        });
      }

      // LATE ARRIVAL EVALUATION (applies to SIGN_IN)
      let recordStatus = 'ON_TIME';
      if (targetCheckpoint.type === 'SIGN_IN' || targetCheckpoint.sequenceOrder === 1) {
        const lateEvaluation = evaluateLateArrival(actualTime, shift.startTime, shift.gracePeriodMinutes);
        if (lateEvaluation.isLate) {
          recordStatus = 'LATE';
          await NotificationService.sendLateArrivalAlert({
            employee,
            shift,
            deltaMinutes: lateEvaluation.deltaMinutes,
            photoUrl,
          });
        }
      } else if (targetCheckpoint.type === 'LUNCH_OUT' || targetCheckpoint.type === 'TEA_OUT') {
        recordStatus = 'BREAK';
      }

      // CREATE ATTENDANCE RECORD
      const record = await prisma.attendanceRecord.create({
        data: {
          employeeId,
          checkpointId: targetCheckpoint.id,
          shiftId: shift.id,
          date: todayDate,
          actualTime,
          status: recordStatus,
          photoUrl,
          gpsLat: lat,
          gpsLng: lng,
          gpsAccuracy: gpsAcc,
          geofenceStatus: 'INSIDE',
          distanceToZone: geofenceResult.distanceMeters,
          livenessScore: livenessScore ? parseFloat(livenessScore) : 98.2,
          notes: notes ? notes.trim() : null,
        },
        include: {
          employee: {
            select: {
              id: true,
              employeeCode: true,
              name: true,
              photoUrl: true,
              section: true,
            },
          },
          checkpoint: true,
          shift: true,
        },
      });

      // BROADCAST VIA SOCKET.IO TO ALL OPS DASHBOARDS
      broadcastAttendanceRecord(record);

      return res.status(201).json({
        success: true,
        message: `Checkpoint "${targetCheckpoint.name}" recorded successfully.`,
        data: record,
      });
    } catch (error) {
      console.error('[CHECKPOINT:SUBMIT_ERROR]', error);
      return res.status(500).json({ success: false, error: 'Failed to record checkpoint.' });
    }
  },
};

module.exports = CheckpointController;
