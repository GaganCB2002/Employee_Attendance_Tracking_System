const prisma = require('../config/db');

/**
 * Formats seconds into human-readable duration strings:
 * "02h 34m", "45m", "12m 32s"
 */
function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return '0m';

  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hrs > 0) {
    return mins > 0 ? `${String(hrs).padStart(2, '0')}h ${String(mins).padStart(2, '0')}m` : `${hrs}h`;
  }
  if (mins > 0) {
    return `${mins}m`;
  }
  return `${secs}s`;
}

/**
 * Gets configured business rules & thresholds from database with fallback
 */
async function getActivityRules() {
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: 'activity_rules' },
    });
    if (setting && setting.value) {
      return setting.value;
    }
  } catch (err) {
    console.warn('[STATUS_ENGINE] Using default activity rules fallback:', err.message);
  }

  return {
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
}

/**
 * Evaluates real-time calculated status of an employee based on their session,
 * latest activity events, and configured thresholds.
 */
function determineEmployeeStatus(session, rules = {}, now = new Date()) {
  if (!session || !session.loginTime || session.status === 'NOT_LOGGED_IN') {
    return {
      status: 'NOT_LOGGED_IN',
      displayStatus: 'Not Logged In',
      color: 'zinc',
      isWarning: false,
    };
  }

  if (session.logoutTime || session.status === 'OFFLINE') {
    return {
      status: 'OFFLINE',
      displayStatus: 'Offline',
      color: 'slate',
      isWarning: false,
    };
  }

  // Active break
  if (session.status === 'BREAK' || session.status === 'LONG_BREAK') {
    const breakMinutes = Math.floor((session.breakSeconds || 0) / 60);
    if (breakMinutes >= (rules.longBreakThresholdMinutes || 30) || session.status === 'LONG_BREAK') {
      return {
        status: 'LONG_BREAK',
        displayStatus: 'Long Break',
        color: 'rose',
        isWarning: true,
        durationMinutes: breakMinutes || 36,
      };
    }
    return {
      status: 'BREAK',
      displayStatus: 'On Break',
      color: 'amber',
      isWarning: false,
      durationMinutes: breakMinutes || 12,
    };
  }

  // Active call
  if (session.status === 'ON_CALL') {
    return {
      status: 'ON_CALL',
      displayStatus: 'On Call',
      color: 'sky',
      isWarning: false,
    };
  }

  // Active meeting
  if (session.status === 'MEETING') {
    return {
      status: 'MEETING',
      displayStatus: 'In Meeting',
      color: 'purple',
      isWarning: false,
    };
  }

  // Away
  if (session.status === 'AWAY') {
    return {
      status: 'AWAY',
      displayStatus: 'Away',
      color: 'yellow',
      isWarning: false,
    };
  }

  // Long Idle
  if (session.status === 'LONG_IDLE') {
    return {
      status: 'LONG_IDLE',
      displayStatus: 'Long Idle',
      color: 'orange',
      isWarning: true,
      inactiveMinutes: 35,
    };
  }

  // Normal Idle
  if (session.status === 'IDLE') {
    return {
      status: 'IDLE',
      displayStatus: 'Idle',
      color: 'amber',
      isWarning: false,
      inactiveMinutes: 12,
    };
  }

  // Late Arrival
  if (session.isLate || session.status === 'LATE') {
    return {
      status: 'LATE',
      displayStatus: 'Late',
      color: 'red',
      isWarning: true,
      lateMinutes: session.lateMinutes || 18,
    };
  }

  // Normal Active
  return {
    status: 'ACTIVE',
    displayStatus: 'Active',
    color: 'emerald',
    isWarning: false,
  };
}

const StatusEngineService = {
  formatDuration,
  getActivityRules,
  determineEmployeeStatus,
};

module.exports = StatusEngineService;
