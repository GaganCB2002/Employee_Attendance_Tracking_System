/**
 * AttendX Database Module
 * Provides unified schema initialization, table creation, and seed execution.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function uuid() {
  return crypto.randomUUID();
}

const DATA_DIR = path.resolve(__dirname, '../data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

/**
 * SQLite & Postgres DDL Dictionaries
 */
const TABLES_DDL = `
  CREATE TABLE IF NOT EXISTS sections (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS shifts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    grace_period_minutes INTEGER DEFAULT 15,
    section_id TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS checkpoints (
    id TEXT PRIMARY KEY,
    shift_id TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT DEFAULT 'CUSTOM',
    sequence_order INTEGER NOT NULL,
    expected_time TEXT,
    is_mandatory INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (shift_id) REFERENCES shifts(id) ON DELETE CASCADE,
    UNIQUE(shift_id, sequence_order)
  );

  CREATE TABLE IF NOT EXISTS admin_users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('SUPER_ADMIN', 'SECTION_ADMIN')),
    status TEXT DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'LOCKED', 'INACTIVE')),
    section_id TEXT,
    failed_attempts INTEGER DEFAULT 0,
    locked_at TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS employees (
    id TEXT PRIMARY KEY,
    employee_code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    phone TEXT,
    password_hash TEXT NOT NULL,
    photo_url TEXT,
    section_id TEXT NOT NULL,
    shift_id TEXT NOT NULL,
    status TEXT DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'LOCKED', 'INACTIVE')),
    failed_attempts INTEGER DEFAULT 0,
    locked_at TEXT,
    lock_reason TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (section_id) REFERENCES sections(id),
    FOREIGN KEY (shift_id) REFERENCES shifts(id)
  );

  CREATE TABLE IF NOT EXISTS geofence_zones (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    radius_meters REAL DEFAULT 50.0,
    is_active INTEGER DEFAULT 1,
    section_id TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS attendance_records (
    id TEXT PRIMARY KEY,
    employee_id TEXT NOT NULL,
    checkpoint_id TEXT NOT NULL,
    shift_id TEXT NOT NULL,
    date TEXT NOT NULL,
    actual_time TEXT DEFAULT CURRENT_TIMESTAMP,
    status TEXT NOT NULL CHECK(status IN ('ON_TIME', 'LATE', 'BREACH', 'BREAK')),
    photo_url TEXT NOT NULL,
    gps_lat REAL NOT NULL,
    gps_lng REAL NOT NULL,
    gps_accuracy REAL NOT NULL,
    geofence_status TEXT DEFAULT 'INSIDE' CHECK(geofence_status IN ('INSIDE', 'OUTSIDE')),
    distance_to_zone REAL DEFAULT 0.0,
    liveness_score REAL DEFAULT 98.4,
    notes TEXT,
    approved_exception INTEGER DEFAULT 0,
    approved_by TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    FOREIGN KEY (checkpoint_id) REFERENCES checkpoints(id) ON DELETE CASCADE,
    FOREIGN KEY (shift_id) REFERENCES shifts(id)
  );

  CREATE TABLE IF NOT EXISTS login_attempts (
    id TEXT PRIMARY KEY,
    identifier TEXT NOT NULL,
    user_type TEXT NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    success INTEGER DEFAULT 0,
    failure_reason TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS audit_log (
    id TEXT PRIMARY KEY,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    actor_id TEXT,
    actor_role TEXT,
    details TEXT,
    ip_address TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_att_emp_date ON attendance_records(employee_id, date);
  CREATE INDEX IF NOT EXISTS idx_att_date ON attendance_records(date);
  CREATE INDEX IF NOT EXISTS idx_att_status ON attendance_records(status);
  CREATE INDEX IF NOT EXISTS idx_login_ident ON login_attempts(identifier, created_at);
`;

/**
 * Initialize schema using built-in node:sqlite or export DDL
 */
function initDatabase() {
  let DatabaseSync;
  try {
    DatabaseSync = require('node:sqlite').DatabaseSync;
  } catch (err) {
    console.log('[DB] node:sqlite not available in this environment. DDL is accessible via schema.sql');
    return null;
  }

  const dbPath = path.join(DATA_DIR, 'attendx.db');
  const db = new DatabaseSync(dbPath);
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec(TABLES_DDL);

  console.log(`[DB] Database schema initialized at ${dbPath}`);
  return db;
}

module.exports = {
  TABLES_DDL,
  initDatabase,
  uuid,
  DATA_DIR,
};
