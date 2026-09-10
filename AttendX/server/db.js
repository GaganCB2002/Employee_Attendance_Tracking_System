'use strict';
// Database module: settings accessors, audit log, and demo seed data.
const { db } = require('./schema');
const { hashPassword } = require('./crypto');

const DEFAULTS = {
  session_timeout_minutes: '15',
  max_login_attempts: '3',
  data_retention_days: '180',
  require_consent: '1',
};
const insS = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
for (const [k, v] of Object.entries(DEFAULTS)) insS.run(k, v);

function getSetting(key) {
  const r = db.prepare('SELECT value FROM settings WHERE key=?').get(key);
  return r ? r.value : undefined;
}
function setSetting(key, value) {
  db.prepare('INSERT INTO settings (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value')
    .run(key, String(value));
}
function getAllSettings() {
  const o = {};
  for (const r of db.prepare('SELECT key, value FROM settings').all()) o[r.key] = r.value;
  return o;
}

function audit(action, actor, role, details) {
  db.prepare('INSERT INTO audit_log (actor, actor_role, action, details) VALUES (?,?,?,?)')
    .run(actor || null, role || null, action, details ? JSON.stringify(details) : null);
}

const DEFAULT_CHECKPOINTS = [
  { kind: 'SIGN_IN', name: 'Sign In' },
  { kind: 'LUNCH_OUT', name: 'Lunch Break - Out' },
  { kind: 'LUNCH_IN', name: 'Lunch Break - In' },
  { kind: 'TEA_OUT', name: 'Tea Break - Out' },
  { kind: 'TEA_IN', name: 'Tea Break - In' },
  { kind: 'SIGN_OUT', name: 'Sign Out' },
  { kind: 'CUSTOM', name: 'Custom Checkpoint 1' },
  { kind: 'CUSTOM', name: 'Custom Checkpoint 2' },
];

function ensureDefaultCheckpoints(shiftId) {
  const ins = db.prepare('INSERT INTO checkpoints (shift_id, name, sequence, kind) VALUES (?,?,?,?)');
  DEFAULT_CHECKPOINTS.forEach((cp, i) => ins.run(shiftId, cp.name, i + 1, cp.kind));
}

function seed() {
  const adminCount = db.prepare('SELECT COUNT(*) AS n FROM admins').get().n;
  if (adminCount > 0) return false;
  const insSection = db.prepare('INSERT INTO sections (name, description) VALUES (?, ?)');
  const s1 = insSection.run('Production', 'Production floor section').lastInsertRowid;
  const s2 = insSection.run('Quality Control', 'QA section').lastInsertRowid;
  const insShift = db.prepare(
    'INSERT INTO shifts (name, start_time, end_time, late_grace_minutes, section_id) VALUES (?,?,?,?,?)');
  const sh1 = insShift.run('Day Shift A', '10:30', '18:30', 10, null).lastInsertRowid;
  const sh2 = insShift.run('Morning Shift', '06:00', '14:00', 15, null).lastInsertRowid;
  const sh3 = insShift.run('Evening Shift', '14:00', '22:00', 10, null).lastInsertRowid;
  ensureDefaultCheckpoints(sh1);
  ensureDefaultCheckpoints(sh2);
  ensureDefaultCheckpoints(sh3);
  const insAdmin = db.prepare('INSERT INTO admins (admin_id, name, role, password_hash, section_id) VALUES (?,?,?,?,?)');
  insAdmin.run('SA001', 'Section Admin - Production', 'SECTION_ADMIN', hashPassword('Admin@123'), s1);
  insAdmin.run('SA002', 'Section Admin - Quality Control', 'SECTION_ADMIN', hashPassword('Admin@123'), s2);
  insAdmin.run('SUPER01', 'Super Admin', 'SUPER_ADMIN', hashPassword('Super@123'), null);
  db.prepare('INSERT INTO geofence_zones (name, latitude, longitude, radius_m, section_id) VALUES (?,?,?,?,?)')
    .run('Main Office', 12.9716, 77.5946, 50, null);
  const insEmp = db.prepare(
    'INSERT INTO employees (employee_id, name, section_id, shift_id, password_hash, consent_given, consent_at) VALUES (?,?,?,?,?,?,?)');
  const demo = [
    ['EMP001', 'Rahul Sharma', s1, sh1, 'Emp@123'],
    ['EMP002', 'Priya Patel', s1, sh1, 'Emp@123'],
    ['EMP003', 'Amit Kumar', s2, sh1, 'Emp@123'],
    ['EMP004', 'Sneha Reddy', s2, sh2, 'Emp@123'],
  ];
  for (const [code, name, sec, sh, pw] of demo) {
    insEmp.run(code, name, sec, sh, hashPassword(pw), 1, new Date().toISOString());
  }
  audit('SEED', 'system', null, 'Database seeded with demo data');
  console.log('[db] Seeded demo data (Super: SUPER01/Super@123, Section: SA001/Admin@123, Emp: EMP001/Emp@123)');
  return true;
}
seed();

module.exports = { db, ensureDefaultCheckpoints, getSetting, setSetting, getAllSettings, audit };
