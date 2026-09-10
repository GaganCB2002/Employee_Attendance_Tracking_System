'use strict';
// SQLite schema (node:sqlite built-in, Node >= 22.5).
const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const { DATA_DIR } = require('./env');

fs.mkdirSync(path.join(DATA_DIR, 'media'), { recursive: true });
const db = new DatabaseSync(path.join(DATA_DIR, 'attendx.db'));
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

db.exec(`
CREATE TABLE IF NOT EXISTS sections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  description TEXT DEFAULT ''
);
CREATE TABLE IF NOT EXISTS shifts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  late_grace_minutes INTEGER NOT NULL DEFAULT 10,
  section_id INTEGER REFERENCES sections(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS admins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  admin_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('SECTION_ADMIN','SUPER_ADMIN')),
  password_hash TEXT NOT NULL,
  section_id INTEGER REFERENCES sections(id) ON DELETE SET NULL,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS employees (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  section_id INTEGER NOT NULL REFERENCES sections(id) ON DELETE RESTRICT,
  shift_id INTEGER NOT NULL REFERENCES shifts(id) ON DELETE RESTRICT,
  password_hash TEXT NOT NULL,
  profile_photo TEXT,
  consent_given INTEGER NOT NULL DEFAULT 0,
  consent_at TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS checkpoints (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  shift_id INTEGER NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sequence INTEGER NOT NULL,
  kind TEXT NOT NULL DEFAULT 'CUSTOM'
      CHECK (kind IN ('SIGN_IN','LUNCH_OUT','LUNCH_IN','TEA_OUT','TEA_IN','SIGN_OUT','CUSTOM')),
  UNIQUE (shift_id, sequence)
);
CREATE TABLE IF NOT EXISTS geofence_zones (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  radius_m INTEGER NOT NULL DEFAULT 50 CHECK (radius_m >= 20),
  section_id INTEGER REFERENCES sections(id) ON DELETE CASCADE,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS attendance_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  shift_id INTEGER NOT NULL REFERENCES shifts(id) ON DELETE RESTRICT,
  checkpoint_id INTEGER NOT NULL REFERENCES checkpoints(id) ON DELETE RESTRICT,
  checkpoint_name TEXT NOT NULL,
  work_date TEXT NOT NULL,
  checkpoint_time TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('ON_TIME','LATE')),
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  accuracy_m REAL,
  media_uuid TEXT NOT NULL,
  media_type TEXT NOT NULL DEFAULT 'image/jpeg',
  sequence INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_att_emp_date ON attendance_records(employee_id, work_date);
CREATE INDEX IF NOT EXISTS idx_att_date ON attendance_records(work_date);
CREATE TABLE IF NOT EXISTS login_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  identity TEXT NOT NULL,
  role TEXT NOT NULL,
  success INTEGER NOT NULL,
  reason TEXT,
  ip TEXT,
  at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_type TEXT NOT NULL CHECK (user_type IN ('EMPLOYEE','ADMIN')),
  ref_id INTEGER NOT NULL,
  display_id TEXT NOT NULL,
  role TEXT NOT NULL,
  name TEXT NOT NULL,
  section_id INTEGER,
  locked INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  last_seen INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS geofence_rejections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  employee_code TEXT NOT NULL,
  section_id INTEGER,
  checkpoint_name TEXT,
  latitude REAL,
  longitude REAL,
  distance_m REAL,
  zone_id INTEGER,
  zone_name TEXT,
  at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor TEXT,
  actor_role TEXT,
  action TEXT NOT NULL,
  details TEXT,
  at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS consents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id INTEGER NOT NULL UNIQUE REFERENCES employees(id) ON DELETE CASCADE,
  accepted INTEGER NOT NULL,
  at TEXT NOT NULL DEFAULT (datetime('now')),
  text_snapshot TEXT
);
CREATE TABLE IF NOT EXISTS shift_swaps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  from_shift_id INTEGER NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
  to_shift_id INTEGER NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
  work_date TEXT NOT NULL,
  reason TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','APPROVED','REJECTED')),
  decided_by INTEGER,
  at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);
`);

module.exports = { db };
