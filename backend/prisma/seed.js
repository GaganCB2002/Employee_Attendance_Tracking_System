const bcrypt = require('bcryptjs');
const prisma = require('../src/config/db');

async function main() {
  console.log('--- Starting AttendX Database Seed with Live TV & Org Data ---');

  // 1. Create Departments
  const departmentData = [
    { code: 'DEPT-IT', name: 'IT', description: 'Systems, DevOps & Software Infrastructure', managerName: 'Sarah Lin' },
    { code: 'DEPT-HR', name: 'HR', description: 'Talent Acquisition & Employee Operations', managerName: 'Michael Chen' },
    { code: 'DEPT-FIN', name: 'Finance', description: 'Corporate Accounting & Treasury', managerName: 'Elena Rostova' },
    { code: 'DEPT-OPS', name: 'Operations', description: 'Flight Hardware & Mission Command', managerName: 'Marcus Vance' },
    { code: 'DEPT-SALES', name: 'Sales', description: 'Aerospace Commercial Contracts', managerName: 'David Kalu' },
    { code: 'DEPT-MGMT', name: 'Management', description: 'Executive Leadership & Strategy', managerName: 'Victoria Sterling' },
    { code: 'DEPT-PROD', name: 'Production', description: 'Advanced Manufacturing & Assembly', managerName: 'Arthur Pendelton' },
  ];

  const departments = {};
  for (const d of departmentData) {
    const dept = await prisma.department.upsert({
      where: { code: d.code },
      update: { name: d.name, description: d.description, managerName: d.managerName },
      create: d,
    });
    departments[d.code] = dept;
  }
  console.log(`[SEED] Created/Verified ${Object.keys(departments).length} Departments.`);

  // 2. Create Floors
  const floorData = [
    { code: 'FL-00', name: 'Ground Floor', level: 0, description: 'Reception, Security Operations & Visitor Bay' },
    { code: 'FL-01', name: '1st Floor', level: 1, description: 'Sales, Marketing & Commercial Contracts' },
    { code: 'FL-02', name: '2nd Floor', level: 2, description: 'Human Resources & Corporate Training Center' },
    { code: 'FL-03', name: '3rd Floor', level: 3, description: 'Engineering, DevOps & Software Labs' },
    { code: 'FL-04', name: '4th Floor', level: 4, description: 'Finance, Compliance & Legal Department' },
    { code: 'FL-05', name: '5th Floor', level: 5, description: 'Executive Suites, Boardroom & Mission Ops' },
  ];

  const floors = {};
  for (const f of floorData) {
    const floor = await prisma.floor.upsert({
      where: { code: f.code },
      update: { name: f.name, level: f.level, description: f.description },
      create: f,
    });
    floors[f.code] = floor;
  }
  console.log(`[SEED] Created/Verified ${Object.keys(floors).length} Floors.`);

  // 3. Create Sections
  const sectionData = [
    { code: 'SEC-A-F1', name: 'Sec-A / Flow-1', description: 'Avionics & Flight Hardware' },
    { code: 'SEC-A-F2', name: 'Sec-A / Flow-2', description: 'Propulsion & Cryo Systems' },
    { code: 'SEC-B-F3', name: 'Sec-B / Flow-3', description: 'Telemetry & Signal Processing' },
    { code: 'SEC-B-F4', name: 'Sec-B / Flow-4', description: 'Composite Structures & Airframe' },
    { code: 'SEC-C-F5', name: 'Sec-C / Flow-5', description: 'Guidance & Navigation Systems' },
    { code: 'SEC-C-F6', name: 'Sec-C / Flow-6', description: 'Mission Command Operations' },
  ];

  const sections = {};
  for (const s of sectionData) {
    const sec = await prisma.section.upsert({
      where: { code: s.code },
      update: { name: s.name, description: s.description },
      create: s,
    });
    sections[s.code] = sec;
  }
  console.log(`[SEED] Created/Verified ${Object.keys(sections).length} Sections.`);

  // 4. Create Shifts (6 configurable shifts)
  const shiftDefinitions = [
    { name: 'Shift-01 (06:00-14:30)', startTime: '06:00', endTime: '14:30', gracePeriodMinutes: 15 },
    { name: 'Shift-02 (08:00-16:30)', startTime: '08:00', endTime: '16:30', gracePeriodMinutes: 15 },
    { name: 'Shift-03 (09:00-18:00)', startTime: '09:00', endTime: '18:00', gracePeriodMinutes: 15 },
    { name: 'Shift-04 (14:00-22:30)', startTime: '14:00', endTime: '22:30', gracePeriodMinutes: 15 },
    { name: 'Shift-05 (18:00-02:30)', startTime: '18:00', endTime: '02:30', gracePeriodMinutes: 15 },
    { name: 'Shift-06 (22:00-06:30)', startTime: '22:00', endTime: '06:30', gracePeriodMinutes: 15 },
  ];

  const shifts = [];
  for (let i = 0; i < shiftDefinitions.length; i++) {
    const def = shiftDefinitions[i];
    let shift = await prisma.shift.findFirst({ where: { name: def.name } });
    if (!shift) {
      shift = await prisma.shift.create({
        data: def,
      });
    }
    shifts.push(shift);

    // Create standard 8 Checkpoints for each shift
    const defaultCheckpoints = [
      { name: 'Sign In', type: 'SIGN_IN', sequenceOrder: 1, expectedTime: def.startTime },
      { name: 'Lunch Break — Out', type: 'LUNCH_OUT', sequenceOrder: 2, expectedTime: '12:00' },
      { name: 'Lunch Break — In', type: 'LUNCH_IN', sequenceOrder: 3, expectedTime: '12:45' },
      { name: 'Tea Break — Out', type: 'TEA_OUT', sequenceOrder: 4, expectedTime: '15:15' },
      { name: 'Tea Break — In', type: 'TEA_IN', sequenceOrder: 5, expectedTime: '15:30' },
      { name: 'Sign Out', type: 'SIGN_OUT', sequenceOrder: 6, expectedTime: def.endTime },
      { name: 'Shift Handover Briefing', type: 'CUSTOM', sequenceOrder: 7, expectedTime: def.endTime },
      { name: 'Telemetry Log Sync', type: 'CUSTOM', sequenceOrder: 8, expectedTime: def.endTime },
    ];

    for (const cp of defaultCheckpoints) {
      await prisma.checkpoint.upsert({
        where: {
          shiftId_sequenceOrder: {
            shiftId: shift.id,
            sequenceOrder: cp.sequenceOrder,
          },
        },
        update: { name: cp.name, type: cp.type, expectedTime: cp.expectedTime },
        create: {
          ...cp,
          shiftId: shift.id,
        },
      });
    }
  }
  console.log(`[SEED] Created/Verified ${shifts.length} Shifts with 8 sequential Checkpoints each.`);

  // 5. Create Geofence Zones
  const geofences = [
    {
      name: 'HQ-Alpha Primary Campus',
      code: 'GEO-HQ-ALPHA',
      latitude: 37.7749,
      longitude: -122.4194,
      radiusMeters: 50.0,
    },
    {
      name: 'Sec-B Test Substation & Gate S4',
      code: 'GEO-SEC-B-S4',
      latitude: 37.7758,
      longitude: -122.4182,
      radiusMeters: 40.0,
    },
  ];

  for (const gf of geofences) {
    await prisma.geofenceZone.upsert({
      where: { code: gf.code },
      update: { name: gf.name, latitude: gf.latitude, longitude: gf.longitude, radiusMeters: gf.radiusMeters },
      create: gf,
    });
  }

  // 6. Create Admin Users
  const superAdminPassword = await bcrypt.hash('admin123', 10);
  const sectionAdminPassword = await bcrypt.hash('section123', 10);

  await prisma.adminUser.upsert({
    where: { username: 'superadmin' },
    update: { passwordHash: superAdminPassword, role: 'SUPER_ADMIN' },
    create: {
      username: 'superadmin',
      name: 'Chief Ops Commander',
      passwordHash: superAdminPassword,
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
    },
  });

  await prisma.adminUser.upsert({
    where: { username: 'engadmin' },
    update: { passwordHash: sectionAdminPassword, role: 'SECTION_ADMIN', sectionId: sections['SEC-A-F1'].id },
    create: {
      username: 'engadmin',
      name: 'Flight Lead Marcus',
      passwordHash: sectionAdminPassword,
      role: 'SECTION_ADMIN',
      sectionId: sections['SEC-A-F1'].id,
      status: 'ACTIVE',
    },
  });
  console.log('[SEED] Verified Super Admin and Section Admin accounts.');

  // 7. Create 15 Realistic Employees mapped across Departments and Floors
  const employeePassword = await bcrypt.hash('employee123', 10);
  const EMPLOYEES_METADATA = [
    { name: 'Rajesh Kumar', dept: 'DEPT-IT', floor: 'FL-03', title: 'Lead Full-Stack Engineer', manager: 'Sarah Lin' },
    { name: 'Anita Sharma', dept: 'DEPT-HR', floor: 'FL-02', title: 'Senior Talent Partner', manager: 'Michael Chen' },
    { name: 'Priya Patel', dept: 'DEPT-FIN', floor: 'FL-04', title: 'Chief Financial Analyst', manager: 'Elena Rostova' },
    { name: 'Marcus Vance', dept: 'DEPT-OPS', floor: 'FL-05', title: 'Flight Operations Controller', manager: 'Victoria Sterling' },
    { name: 'David Kalu', dept: 'DEPT-SALES', floor: 'FL-01', title: 'Enterprise Account Executive', manager: 'Victoria Sterling' },
    { name: 'Sarah Lin', dept: 'DEPT-IT', floor: 'FL-03', title: 'VP of Engineering', manager: 'Victoria Sterling' },
    { name: 'Michael Chen', dept: 'DEPT-HR', floor: 'FL-02', title: 'Director of People', manager: 'Victoria Sterling' },
    { name: 'Elena Rostova', dept: 'DEPT-FIN', floor: 'FL-04', title: 'Corporate Controller', manager: 'Victoria Sterling' },
    { name: 'Vikram Singh', dept: 'DEPT-PROD', floor: 'FL-00', title: 'Avionics Assembly Technician', manager: 'Arthur Pendelton' },
    { name: 'Sunita Reddy', dept: 'DEPT-IT', floor: 'FL-03', title: 'DevOps & Telemetry Specialist', manager: 'Sarah Lin' },
    { name: 'Arjun Das', dept: 'DEPT-SALES', floor: 'FL-01', title: 'Commercial Aerospace BDM', manager: 'David Kalu' },
    { name: 'Neha Gupta', dept: 'DEPT-HR', floor: 'FL-02', title: 'Employee Relations Lead', manager: 'Michael Chen' },
    { name: 'Owen Brennan', dept: 'DEPT-OPS', floor: 'FL-05', title: 'Substation Radar Technician', manager: 'Marcus Vance' }, // Locked
    { name: 'Zara Siddiqui', dept: 'DEPT-PROD', floor: 'FL-00', title: 'Quality Assurance Inspector', manager: 'Arthur Pendelton' },
    { name: 'Kavita Menon', dept: 'DEPT-MGMT', floor: 'FL-05', title: 'Chief Operations Officer', manager: 'Victoria Sterling' },
  ];

  const sectionKeys = Object.keys(sections);
  const createdEmployees = [];
  const today = new Date();
  const todayDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  for (let i = 0; i < EMPLOYEES_METADATA.length; i++) {
    const meta = EMPLOYEES_METADATA[i];
    const code = `EMP-${(9000 + i * 137).toString().slice(0, 5)}`;
    const secKey = sectionKeys[i % sectionKeys.length];
    const section = sections[secKey];
    const shift = shifts[i % shifts.length];
    const dept = departments[meta.dept];
    const floor = floors[meta.floor];
    const isLocked = i === 12; // Owen Brennan locked for security testing

    const emp = await prisma.employee.upsert({
      where: { employeeCode: code },
      update: {
        name: meta.name,
        departmentId: dept.id,
        floorId: floor.id,
        jobTitle: meta.title,
        managerName: meta.manager,
        sectionId: section.id,
        shiftId: shift.id,
        status: isLocked ? 'LOCKED' : 'ACTIVE',
        failedAttempts: isLocked ? 3 : 0,
        lockedAt: isLocked ? new Date() : null,
      },
      create: {
        employeeCode: code,
        name: meta.name,
        email: `${meta.name.toLowerCase().replace(' ', '.')}@attendx.aero`,
        phone: `+1-555-01${(i + 10).toString().padStart(2, '0')}`,
        jobTitle: meta.title,
        managerName: meta.manager,
        departmentId: dept.id,
        floorId: floor.id,
        joiningDate: new Date(2023, i % 12, 1 + (i * 2)),
        passwordHash: employeePassword,
        photoUrl: `/uploads/profiles/emp-${i + 1}.jpg`,
        sectionId: section.id,
        shiftId: shift.id,
        status: isLocked ? 'LOCKED' : 'ACTIVE',
        failedAttempts: isLocked ? 3 : 0,
        lockedAt: isLocked ? new Date() : null,
      },
    });

    createdEmployees.push(emp);
  }
  console.log(`[SEED] Created/Verified 15 Employees across Departments and Floors.`);

  // 8. Create Realistic Activity Sessions & Events for Live TV Monitoring
  // Activity Status Pool to match prompt:
  // Active, Idle, On Break, On Call, In Meeting, Away, Not Logged In, Late, Long Idle, Long Break, Offline
  const LIVE_STATUS_PROFILES = [
    { status: 'ACTIVE', activeSec: 9240, idleSec: 240, breakSec: 900, callSec: 0, meetSec: 0, isLate: false },
    { status: 'ON_CALL', activeSec: 6720, idleSec: 120, breakSec: 0, callSec: 1800, meetSec: 0, isLate: false },
    { status: 'BREAK', activeSec: 11100, idleSec: 480, breakSec: 720, callSec: 0, meetSec: 0, isLate: false },
    { status: 'LATE', activeSec: 1200, idleSec: 0, breakSec: 0, callSec: 0, meetSec: 0, isLate: true, lateMin: 22 },
    { status: 'IDLE', activeSec: 7400, idleSec: 780, breakSec: 600, callSec: 600, meetSec: 0, isLate: false },
    { status: 'MEETING', activeSec: 14200, idleSec: 300, breakSec: 900, callSec: 0, meetSec: 2400, isLate: false },
    { status: 'LONG_IDLE', activeSec: 4500, idleSec: 2100, breakSec: 0, callSec: 0, meetSec: 0, isLate: false },
    { status: 'LONG_BREAK', activeSec: 8000, idleSec: 150, breakSec: 2200, callSec: 0, meetSec: 0, isLate: false },
    { status: 'AWAY', activeSec: 5400, idleSec: 900, breakSec: 0, callSec: 0, meetSec: 0, isLate: false },
    { status: 'ACTIVE', activeSec: 16800, idleSec: 600, breakSec: 1200, callSec: 1200, meetSec: 3600, isLate: false },
    { status: 'ON_CALL', activeSec: 9900, idleSec: 180, breakSec: 450, callSec: 2400, meetSec: 0, isLate: false },
    { status: 'OFFLINE', activeSec: 10800, idleSec: 360, breakSec: 900, callSec: 0, meetSec: 0, isLate: false },
    { status: 'NOT_LOGGED_IN', activeSec: 0, idleSec: 0, breakSec: 0, callSec: 0, meetSec: 0, isLate: false }, // Owen (locked)
    { status: 'ACTIVE', activeSec: 8200, idleSec: 200, breakSec: 900, callSec: 0, meetSec: 0, isLate: false },
    { status: 'LATE', activeSec: 4200, idleSec: 100, breakSec: 0, callSec: 0, meetSec: 0, isLate: true, lateMin: 18 },
  ];

  for (let i = 0; i < createdEmployees.length; i++) {
    const emp = createdEmployees[i];
    const prof = LIVE_STATUS_PROFILES[i % LIVE_STATUS_PROFILES.length];

    if (prof.status === 'NOT_LOGGED_IN') {
      continue;
    }

    const loginTime = new Date();
    loginTime.setHours(9, prof.isLate ? prof.lateMin : (i * 3) % 15, 0);

    const lastActivity = new Date();
    if (prof.status === 'IDLE') {
      lastActivity.setMinutes(lastActivity.getMinutes() - 13);
    } else if (prof.status === 'LONG_IDLE') {
      lastActivity.setMinutes(lastActivity.getMinutes() - 35);
    } else if (prof.status === 'OFFLINE') {
      lastActivity.setMinutes(lastActivity.getMinutes() - 55);
    }

    // Upsert attendance session for today
    await prisma.attendanceSession.deleteMany({
      where: { employeeId: emp.id, date: todayDate },
    });

    await prisma.attendanceSession.create({
      data: {
        employeeId: emp.id,
        date: todayDate,
        loginTime,
        lastActivity,
        status: prof.status,
        activeSeconds: prof.activeSec,
        idleSeconds: prof.idleSec,
        breakSeconds: prof.breakSec,
        callSeconds: prof.callSec,
        meetingSeconds: prof.meetSec,
        isLate: prof.isLate,
        lateMinutes: prof.lateMin || 0,
      },
    });

    // Create chronological activity timeline events for this employee
    await prisma.activityEvent.deleteMany({
      where: { employeeId: emp.id },
    });

    const events = [
      { type: 'LOGIN', startOffsetMin: 0, duration: 60 },
      { type: 'ACTIVE', startOffsetMin: 1, duration: 3600 },
      { type: prof.callSec > 0 ? 'CALL_START' : 'IDLE', startOffsetMin: 62, duration: 600 },
      { type: 'ACTIVE', startOffsetMin: 73, duration: 3000 },
      { type: 'BREAK_START', startOffsetMin: 124, duration: prof.breakSec },
      { type: 'ACTIVE', startOffsetMin: 124 + Math.round(prof.breakSec / 60), duration: 2400 },
    ];

    for (const ev of events) {
      const startedAt = new Date(loginTime.getTime() + ev.startOffsetMin * 60000);
      const endedAt = new Date(startedAt.getTime() + ev.duration * 1000);

      await prisma.activityEvent.create({
        data: {
          employeeId: emp.id,
          eventType: ev.type,
          startedAt,
          endedAt,
          durationSeconds: ev.duration,
          metadata: { note: `Event ${ev.type} generated via telemetry` },
        },
      });
    }
  }
  console.log('[SEED] Created Attendance Sessions and Activity Events for Live TV monitoring.');

  // 9. Create Configurable System Settings (Activity Rules & Theme Tokens)
  const defaultActivityRules = {
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

  const defaultThemeTokens = {
    mode: 'dark',
    preset: 'Dark Enterprise',
    primary: '#0284c7',
    secondary: '#38bdf8',
    accent: '#06b6d4',
    background: '#09090b',
    surface: '#18181b',
    sidebar: '#09090b',
    header: '#09090b',
    text: '#f4f4f5',
    mutedText: '#71717a',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    info: '#3b82f6',
    border: '#27272a',
  };

  await prisma.systemSetting.upsert({
    where: { key: 'activity_rules' },
    update: { value: defaultActivityRules },
    create: { key: 'activity_rules', value: defaultActivityRules, updatedBy: 'superadmin' },
  });

  await prisma.systemSetting.upsert({
    where: { key: 'theme_tokens' },
    update: { value: defaultThemeTokens },
    create: { key: 'theme_tokens', value: defaultThemeTokens, updatedBy: 'superadmin' },
  });
  console.log('[SEED] Initialized System Settings for Activity Rules and Theme Tokens.');

  // 10. Seed Realtime Live Alerts
  await prisma.liveAlert.deleteMany({});
  await prisma.liveAlert.createMany({
    data: [
      {
        employeeId: createdEmployees[6].id, // Elena
        type: 'LONG_IDLE',
        severity: 'WARNING',
        title: 'Idle Threshold Exceeded',
        message: 'Elena Rostova (Finance) has been idle for 35 minutes.',
      },
      {
        employeeId: createdEmployees[7].id,
        type: 'LONG_BREAK',
        severity: 'WARNING',
        title: 'Break Limit Exceeded',
        message: 'Vikram Singh (Production) exceeded 30m maximum break duration.',
      },
      {
        employeeId: createdEmployees[3].id, // Priya
        type: 'LATE_LOGIN',
        severity: 'INFO',
        title: 'Late Arrival Logged',
        message: 'Priya Patel logged in 22 minutes after shift start threshold.',
      },
    ],
  });
  console.log('[SEED] Seeded initial Live Alerts.');

  console.log('--- AttendX Seed Completed Successfully ---');
}

main()
  .catch((e) => {
    console.error('[SEED_ERROR]', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
