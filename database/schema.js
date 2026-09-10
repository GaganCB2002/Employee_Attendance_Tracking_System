'use strict';
const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, '..', 'data');
fs.mkdirSync(path.join(DATA_DIR, 'uploads'), { recursive: true });

const db = new DatabaseSync(path.join(DATA_DIR, 'attendx.db'));
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

function uuid() { return crypto.randomUUID(); }

function prepare(sql) {
  const stmt = db.prepare(sql);
  return {
    run(...params) {
      const r = stmt.run(...params);
      return { changes: r.changes, lastInsertRowid: Number(r.lastInsertRowid) || r.lastInsertRowid };
    },
    get(...params) { return stmt.get(...params) || undefined; },
    all(...params) { return stmt.all(...params); }
  };
}

function exec(sql) { db.exec(sql); }

function initSchema() {
  exec(`
    CREATE TABLE IF NOT EXISTS sections (
      id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS shifts (
      id TEXT PRIMARY KEY, name TEXT NOT NULL,
      start_time TEXT NOT NULL, end_time TEXT NOT NULL,
      grace_minutes INTEGER DEFAULT 10,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS admin_users (
      id TEXT PRIMARY KEY, username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL, full_name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('super_admin','section_admin')),
      section_id TEXT, is_active INTEGER DEFAULT 1,
      failed_attempts INTEGER DEFAULT 0, locked_until TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (section_id) REFERENCES sections(id)
    );
    CREATE TABLE IF NOT EXISTS employees (
      id TEXT PRIMARY KEY, employee_id TEXT NOT NULL UNIQUE,
      full_name TEXT NOT NULL, photo_path TEXT,
      section_id TEXT NOT NULL, shift_id TEXT NOT NULL,
      password_hash TEXT NOT NULL, is_active INTEGER DEFAULT 1,
      consent_given INTEGER DEFAULT 0, data_retention_days INTEGER DEFAULT 180,
      failed_attempts INTEGER DEFAULT 0, locked_until TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (section_id) REFERENCES sections(id),
      FOREIGN KEY (shift_id) REFERENCES shifts(id)
    );
    CREATE TABLE IF NOT EXISTS checkpoints (
      id TEXT PRIMARY KEY, shift_id TEXT NOT NULL,
      name TEXT NOT NULL, sequence_order INTEGER NOT NULL,
      is_custom INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (shift_id) REFERENCES shifts(id)
    );
    CREATE TABLE IF NOT EXISTS geofence_zones (
      id TEXT PRIMARY KEY, name TEXT NOT NULL,
      center_lat REAL NOT NULL, center_lng REAL NOT NULL,
      radius_meters REAL DEFAULT 50, is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS attendance_records (
      id TEXT PRIMARY KEY, employee_id TEXT NOT NULL,
      checkpoint_id TEXT NOT NULL, photo_path TEXT NOT NULL,
      latitude REAL, longitude REAL,
      timestamp TEXT DEFAULT (datetime('now')),
      status TEXT NOT NULL CHECK(status IN ('ON_TIME','LATE','REJECTED')),
      section_id TEXT NOT NULL, shift_id TEXT NOT NULL,
      work_date TEXT DEFAULT (date('now')),
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (employee_id) REFERENCES employees(id),
      FOREIGN KEY (checkpoint_id) REFERENCES checkpoints(id),
      FOREIGN KEY (section_id) REFERENCES sections(id),
      FOREIGN KEY (shift_id) REFERENCES shifts(id)
    );
    CREATE TABLE IF NOT EXISTS login_attempts (
      id TEXT PRIMARY KEY, identity TEXT NOT NULL,
      role TEXT NOT NULL, success INTEGER DEFAULT 0,
      reason TEXT, ip TEXT,
      at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS geofence_rejections (
      id TEXT PRIMARY KEY, employee_id TEXT NOT NULL,
      latitude REAL, longitude REAL,
      checkpoint_attempted TEXT, distance_m REAL,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS audit_log (
      id TEXT PRIMARY KEY, event_type TEXT NOT NULL,
      user_type TEXT, user_id TEXT, details TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY, value TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_att_emp_date ON attendance_records(employee_id, work_date);
    CREATE INDEX IF NOT EXISTS idx_att_date ON attendance_records(work_date);
  `);

  const count = prepare('SELECT COUNT(*) as c FROM sections').get();
  if (count && count.c === 0) seed();
}

function seed() {
  const s1 = uuid(), s2 = uuid(), s3 = uuid();
  prepare('INSERT INTO sections (id,name) VALUES (?,?)').run(s1, 'Engineering');
  prepare('INSERT INTO sections (id,name) VALUES (?,?)').run(s2, 'Operations');
  prepare('INSERT INTO sections (id,name) VALUES (?,?)').run(s3, 'Security');

  const sh1 = uuid(), sh2 = uuid(), sh3 = uuid();
  prepare('INSERT INTO shifts (id,name,start_time,end_time,grace_minutes) VALUES (?,?,?,?,?)').run(sh1, 'Morning Alpha', '06:00', '14:00', 10);
  prepare('INSERT INTO shifts (id,name,start_time,end_time,grace_minutes) VALUES (?,?,?,?,?)').run(sh2, 'Day Bravo', '09:00', '17:00', 15);
  prepare('INSERT INTO shifts (id,name,start_time,end_time,grace_minutes) VALUES (?,?,?,?,?)').run(sh3, 'Evening Charlie', '14:00', '22:00', 10);

  const cpNames = ['Sign In','Lunch Break Out','Lunch Break In','Tea Break Out','Tea Break In','Sign Out','Custom Checkpoint 1','Custom Checkpoint 2'];
  const insCp = prepare('INSERT INTO checkpoints (id,shift_id,name,sequence_order,is_custom) VALUES (?,?,?,?,?)');
  [sh1,sh2,sh3].forEach(sid => {
    cpNames.forEach((n,i) => insCp.run(uuid(), sid, n, i+1, i>=6?1:0));
  });

  prepare('INSERT INTO geofence_zones (id,name,center_lat,center_lng,radius_meters) VALUES (?,?,?,?,?)').run(uuid(), 'HQ Alpha', 37.7749, -122.4194, 100);
  prepare('INSERT INTO geofence_zones (id,name,center_lat,center_lng,radius_meters) VALUES (?,?,?,?,?)').run(uuid(), 'Satellite Beta', 37.7800, -122.4050, 75);

  const adminHash = bcrypt.hashSync('admin123', 10);
  prepare('INSERT INTO admin_users (id,username,password_hash,full_name,role) VALUES (?,?,?,?,?)').run(uuid(), 'SUPER-001', adminHash, 'Commander Sarah Chen', 'super_admin');

  const secHash = bcrypt.hashSync('section123', 10);
  prepare('INSERT INTO admin_users (id,username,password_hash,full_name,role,section_id) VALUES (?,?,?,?,?,?)').run(uuid(), 'SA-ENG-01', secHash, 'Marcus Webb', 'section_admin', s1);
  prepare('INSERT INTO admin_users (id,username,password_hash,full_name,role,section_id) VALUES (?,?,?,?,?,?)').run(uuid(), 'SA-OPS-01', secHash, 'Priya Kapoor', 'section_admin', s2);

  const empHash = bcrypt.hashSync('emp123', 10);
  const employees = [
    ['EMP-09411','Marcus Chen',s1,sh1], ['EMP-11029','Elena Rostova',s2,sh2],
    ['EMP-08831','Tariq Mansour',s1,sh3], ['EMP-12004','Devina Patel',s3,sh2],
    ['EMP-10842','Johnathan Vance',s1,sh2], ['EMP-07392','Aisha Okafor',s2,sh1],
    ['EMP-13390','Ryan Sterling',s3,sh3], ['EMP-06215','Yuki Tanaka',s1,sh1]
  ];
  const insEmp = prepare('INSERT INTO employees (id,employee_id,full_name,section_id,shift_id,password_hash) VALUES (?,?,?,?,?,?)');
  employees.forEach(([eid,name,sid,shid]) => insEmp.run(uuid(), eid, name, sid, shid, empHash));

  ['session_timeout_minutes','max_login_attempts','default_geofence_radius','data_retention_days'].forEach((k,i) => {
    prepare('INSERT OR REPLACE INTO settings (key,value) VALUES (?,?)').run(k, ['15','3','50','180'][i]);
  });
}

initSchema();

module.exports = { db: { prepare, exec }, uuid, DATA_DIR };
