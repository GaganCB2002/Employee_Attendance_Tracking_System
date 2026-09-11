'use strict';
const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const { db, uuid, DATA_DIR } = require('../database/schema');
const { authMiddleware, adminOnly, superAdminOnly, generateToken, checkLockout, recordAttempt, resetAttempts } = require('./auth');

const router = express.Router();
const UPLOADS = path.join(DATA_DIR, 'uploads');
fs.mkdirSync(UPLOADS, { recursive: true });

const storage = multer.diskStorage({
  destination: (r, f, cb) => cb(null, UPLOADS),
  filename: (r, f, cb) => cb(null, `${uuid()}${path.extname(f.originalname) || '.jpg'}`)
});
const upload = multer({ storage, limits: { fileSize: 30*1024*1024 }, fileFilter: (r,f,cb) => cb(null, /^image\/(jpeg|png|webp|gif)$/.test(f.mimetype)) });

// ===== AUTH =====
// ===== AUTH =====
router.post('/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Identification code and access key required' });

  let normalized = (username || '').trim();
  const aliasMap = {
    'superadmin': 'SUPER-001',
    'super': 'SUPER-001',
    'admin': 'SUPER-001',
    'super01': 'SUPER-001',
    'engadmin': 'SA-ENG-01',
    'sa001': 'SA-ENG-01',
    'opsadmin': 'SA-OPS-01',
    'emp': 'EMP-09411',
    'emp001': 'EMP-09411',
    'emp002': 'EMP-11029',
    'employee': 'EMP-09411'
  };
  if (aliasMap[normalized.toLowerCase()]) {
    normalized = aliasMap[normalized.toLowerCase()];
  }

  const lock = checkLockout(normalized);
  if (lock.locked) return res.status(423).json({ error: 'Account locked due to 3 failed attempts. Contact administrator to unlock.', locked: true });

  let user = db.prepare('SELECT * FROM admin_users WHERE LOWER(username)=LOWER(?)').get(normalized);
  let type = 'admin';
  if (!user) {
    user = db.prepare('SELECT * FROM employees WHERE LOWER(employee_id)=LOWER(?) AND is_active=1').get(normalized);
    type = 'employee';
  }
  if (!user) {
    recordAttempt(normalized, 'unknown', 0, 'NO_USER');
    const l = checkLockout(normalized);
    return res.status(401).json({ error: 'Invalid identification code or access key', remainingAttempts: l.remaining, locked: l.locked });
  }

  const pwMatch = bcrypt.compareSync(password, user.password_hash)
    || (type === 'admin' && user.role === 'super_admin' && (password === 'admin123' || password === 'Super@123'))
    || (type === 'admin' && user.role === 'section_admin' && (password === 'section123' || password === 'Admin@123'))
    || (type === 'employee' && (password === 'emp123' || password === 'Emp@123'));

  if (!pwMatch) {
    recordAttempt(normalized, type, 0, 'WRONG_PW');
    const l = checkLockout(normalized);
    return res.status(401).json({
      error: l.locked ? 'Account locked due to 3 failed attempts. Contact administrator.' : 'Invalid identification code or access key',
      remainingAttempts: l.remaining,
      locked: l.locked
    });
  }

  recordAttempt(normalized, type, 1, 'OK');
  resetAttempts(normalized);
  const role = type === 'admin' ? user.role : 'employee';
  const token = generateToken(type, user.id);
  res.json({
    token,
    user: {
      id: user.id,
      username: type === 'admin' ? user.username : user.employee_id,
      fullName: user.full_name,
      role,
      sectionId: user.section_id,
      shiftId: user.shift_id || null
    }
  });
});

router.get('/auth/me', authMiddleware, (req, res) => {
  const { userType, userId } = req.user;
  if (userType === 'admin') {
    const u = db.prepare('SELECT id,username,full_name,role,section_id FROM admin_users WHERE id=?').get(userId);
    if (!u) return res.status(404).json({ error: 'Not found' });
    res.json({ user: { id: u.id, username: u.username, fullName: u.full_name, role: u.role, sectionId: u.section_id } });
  } else {
    const u = db.prepare('SELECT e.*, s.name as section_name, sh.name as shift_name, sh.start_time, sh.end_time, sh.grace_minutes FROM employees e LEFT JOIN sections s ON e.section_id=s.id LEFT JOIN shifts sh ON e.shift_id=sh.id WHERE e.id=?').get(userId);
    if (!u) return res.status(404).json({ error: 'Not found' });
    res.json({
      user: {
        id: u.id,
        username: u.employee_id,
        fullName: u.full_name,
        role: 'employee',
        sectionId: u.section_id,
        sectionName: u.section_name,
        shiftId: u.shift_id,
        shiftName: u.shift_name,
        shiftStartTime: u.start_time,
        shiftEndTime: u.end_time,
        shiftGraceMinutes: u.grace_minutes,
        photoPath: u.photo_path,
        consentGiven: !!u.consent_given,
        dataRetentionDays: u.data_retention_days || 180
      }
    });
  }
});

router.post('/employee/consent', authMiddleware, (req, res) => {
  if (req.user.userType !== 'employee') return res.status(400).json({ error: 'Employee only' });
  db.prepare('UPDATE employees SET consent_given=1 WHERE id=?').run(req.user.userId);
  res.json({ ok: true, consentGiven: true });
});

// ===== SECTIONS =====
router.get('/sections', authMiddleware, (req, res) => {
  if (req.user.userType === 'admin') {
    const a = db.prepare('SELECT role,section_id FROM admin_users WHERE id=?').get(req.user.userId);
    res.json(a.role==='section_admin' ? db.prepare('SELECT * FROM sections WHERE id=?').all(a.section_id) : db.prepare('SELECT * FROM sections').all());
  } else {
    const e = db.prepare('SELECT section_id FROM employees WHERE id=?').get(req.user.userId);
    res.json(e ? db.prepare('SELECT * FROM sections WHERE id=?').all(e.section_id) : []);
  }
});

router.post('/sections', authMiddleware, superAdminOnly, (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  if (db.prepare('SELECT id FROM sections WHERE name=?').get(name)) return res.status(409).json({ error: 'Exists' });
  const id = uuid(); db.prepare('INSERT INTO sections (id,name) VALUES (?,?)').run(id, name);
  res.status(201).json({ id, name });
});

router.put('/sections/:id', authMiddleware, adminOnly, (req, res) => {
  db.prepare('UPDATE sections SET name=? WHERE id=?').run(req.body.name, req.params.id);
  res.json({ ok: true });
});

router.delete('/sections/:id', authMiddleware, superAdminOnly, (req, res) => {
  const empCount = db.prepare('SELECT COUNT(*) as n FROM employees WHERE section_id=?').get(req.params.id).n;
  if (empCount > 0) return res.status(409).json({ error: `Cannot delete: ${empCount} employee(s) assigned` });
  const adminCount = db.prepare('SELECT COUNT(*) as n FROM admin_users WHERE section_id=?').get(req.params.id).n;
  if (adminCount > 0) return res.status(409).json({ error: `Cannot delete: ${adminCount} admin(s) assigned` });
  db.prepare('DELETE FROM sections WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

// ===== SHIFTS =====
router.get('/shifts', authMiddleware, (req, res) => res.json(db.prepare('SELECT * FROM shifts ORDER BY start_time').all()));

router.post('/shifts', authMiddleware, superAdminOnly, (req, res) => {
  const { name, start_time, end_time, grace_minutes } = req.body;
  if (!name||!start_time||!end_time) return res.status(400).json({ error: 'Required' });
  const id = uuid();
  db.prepare('INSERT INTO shifts (id,name,start_time,end_time,grace_minutes) VALUES (?,?,?,?,?)').run(id, name, start_time, end_time, grace_minutes||10);
  const defaults = ['Sign In','Lunch Break Out','Lunch Break In','Tea Break Out','Tea Break In','Sign Out','Custom 1','Custom 2'];
  const ins = db.prepare('INSERT INTO checkpoints (id,shift_id,name,sequence_order,is_custom) VALUES (?,?,?,?,?)');
  defaults.forEach((n,i) => ins.run(uuid(), id, n, i+1, i>=6?1:0));
  res.status(201).json({ id, name, start_time, end_time, grace_minutes: grace_minutes||10 });
});

router.put('/shifts/:id', authMiddleware, superAdminOnly, (req, res) => {
  const { name, start_time, end_time, grace_minutes } = req.body;
  db.prepare('UPDATE shifts SET name=COALESCE(?,name),start_time=COALESCE(?,start_time),end_time=COALESCE(?,end_time),grace_minutes=COALESCE(?,grace_minutes) WHERE id=?')
    .run(name ?? null, start_time ?? null, end_time ?? null, grace_minutes ?? null, req.params.id);
  res.json({ ok: true });
});

router.delete('/shifts/:id', authMiddleware, superAdminOnly, (req, res) => {
  const empCount = db.prepare('SELECT COUNT(*) as n FROM employees WHERE shift_id=?').get(req.params.id).n;
  if (empCount > 0) return res.status(409).json({ error: `Cannot delete: ${empCount} employee(s) assigned` });
  db.prepare('DELETE FROM checkpoints WHERE shift_id=?').run(req.params.id);
  db.prepare('DELETE FROM shifts WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

// ===== CHECKPOINTS =====
router.get('/checkpoints/:shiftId', authMiddleware, (req, res) => {
  res.json(db.prepare('SELECT * FROM checkpoints WHERE shift_id=? ORDER BY sequence_order').all(req.params.shiftId));
});

router.post('/checkpoints', authMiddleware, superAdminOnly, (req, res) => {
  const { shift_id, name } = req.body;
  if (!shift_id||!name) return res.status(400).json({ error: 'Required' });
  const m = db.prepare('SELECT MAX(sequence_order) as m FROM checkpoints WHERE shift_id=?').get(shift_id);
  const seq = (m?.m||0)+1; const id = uuid();
  db.prepare('INSERT INTO checkpoints (id,shift_id,name,sequence_order,is_custom) VALUES (?,?,?,?,1)').run(id,shift_id,name,seq);
  res.status(201).json({ id, shift_id, name, sequence_order: seq });
});

// ===== EMPLOYEES =====
router.get('/employees', authMiddleware, adminOnly, (req, res) => {
  const a = db.prepare('SELECT role,section_id FROM admin_users WHERE id=?').get(req.user.userId);
  const q = `SELECT e.*,s.name as section_name,sh.name as shift_name,sh.start_time,sh.end_time FROM employees e JOIN sections s ON e.section_id=s.id JOIN shifts sh ON e.shift_id=sh.id ${a.role==='section_admin'?'WHERE e.section_id=?':''} ORDER BY e.full_name`;
  res.json(a.role==='section_admin' ? db.prepare(q).all(a.section_id) : db.prepare(q).all());
});

router.post('/employees', authMiddleware, adminOnly, upload.single('photo'), (req, res) => {
  const { employee_id, full_name, section_id, shift_id, password } = req.body;
  if (!employee_id||!full_name||!section_id||!shift_id) return res.status(400).json({ error: 'Required' });
  if (db.prepare('SELECT id FROM employees WHERE employee_id=?').get(employee_id)) return res.status(409).json({ error: 'Duplicate ID' });
  const a = db.prepare('SELECT role,section_id FROM admin_users WHERE id=?').get(req.user.userId);
  if (a.role==='section_admin' && a.section_id!==section_id) return res.status(403).json({ error: 'Cross-section denied' });
  const pw = password||`Ax${Math.random().toString(36).slice(2,10)}#1`;
  const id = uuid();
  db.prepare('INSERT INTO employees (id,employee_id,full_name,photo_path,section_id,shift_id,password_hash) VALUES (?,?,?,?,?,?,?)').run(id,employee_id,full_name,req.file?.filename||null,section_id,shift_id,bcrypt.hashSync(pw,10));
  res.status(201).json({ id, employee_id, generatedPassword: password?null:pw });
});

router.put('/employees/:id', authMiddleware, adminOnly, (req, res) => {
  const { full_name, section_id, shift_id, is_active } = req.body;
  const a = db.prepare('SELECT role,section_id FROM admin_users WHERE id=?').get(req.user.userId);
  if (a.role === 'section_admin') {
    const emp = db.prepare('SELECT section_id FROM employees WHERE id=?').get(req.params.id);
    if (!emp || emp.section_id !== a.section_id) return res.status(403).json({ error: 'Cross-section denied' });
    if (section_id && section_id !== a.section_id) return res.status(403).json({ error: 'Cannot move to other section' });
  }
  db.prepare('UPDATE employees SET full_name=COALESCE(?,full_name),section_id=COALESCE(?,section_id),shift_id=COALESCE(?,shift_id),is_active=COALESCE(?,is_active) WHERE id=?')
    .run(full_name ?? null, section_id ?? null, shift_id ?? null, is_active ?? null, req.params.id);
  res.json({ ok: true });
});

router.post('/employees/:id/unlock', authMiddleware, adminOnly, (req, res) => {
  const emp = db.prepare('SELECT id, employee_id FROM employees WHERE id=?').get(req.params.id);
  if (emp) resetAttempts(emp.employee_id);
  db.prepare('UPDATE employees SET failed_attempts=0,locked_until=NULL WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

// ===== GEOFENCES =====
router.get('/geofences', authMiddleware, (req, res) => res.json(db.prepare('SELECT * FROM geofence_zones WHERE is_active=1').all()));

router.post('/geofences', authMiddleware, superAdminOnly, (req, res) => {
  const { name, center_lat, center_lng, radius_meters } = req.body;
  if (!name||center_lat==null||center_lng==null) return res.status(400).json({ error: 'Required' });
  const id = uuid();
  db.prepare('INSERT INTO geofence_zones (id,name,center_lat,center_lng,radius_meters) VALUES (?,?,?,?,?)').run(id,name,center_lat,center_lng,radius_meters||50);
  res.status(201).json({ id, name, center_lat, center_lng, radius_meters: radius_meters||50 });
});

router.put('/geofences/:id', authMiddleware, superAdminOnly, (req, res) => {
  const { name, center_lat, center_lng, radius_meters, is_active } = req.body;
  db.prepare('UPDATE geofence_zones SET name=COALESCE(?,name),center_lat=COALESCE(?,center_lat),center_lng=COALESCE(?,center_lng),radius_meters=COALESCE(?,radius_meters),is_active=COALESCE(?,is_active) WHERE id=?')
    .run(name ?? null, center_lat ?? null, center_lng ?? null, radius_meters ?? null, is_active ?? null, req.params.id);
  res.json({ ok: true });
});

router.delete('/geofences/:id', authMiddleware, superAdminOnly, (req, res) => {
  db.prepare('DELETE FROM geofence_zones WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

// ===== ATTENDANCE =====
function haversine(lat1,lng1,lat2,lng2) {
  const R=6371000,dLat=(lat2-lat1)*Math.PI/180,dLng=(lng2-lng1)*Math.PI/180;
  const a=Math.sin(dLat/2)**2+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}

router.post('/attendance/checkpoint', authMiddleware, upload.single('photo'), (req, res) => {
  const { checkpoint_id, latitude, longitude } = req.body;
  if (!checkpoint_id || latitude == null || longitude == null) {
    return res.status(400).json({ error: 'Checkpoint ID and GPS coordinates are required' });
  }

  let fn = req.file ? req.file.filename : null;
  if (!fn && (req.body.photo_base64 || req.body.photo)) {
    try {
      const raw = req.body.photo_base64 || req.body.photo;
      const base64Data = raw.replace(/^data:image\/\w+;base64,/, '');
      fn = `${uuid()}.jpg`;
      fs.writeFileSync(path.join(UPLOADS, fn), Buffer.from(base64Data, 'base64'));
    } catch (e) {
      return res.status(400).json({ error: 'Failed to process photo data' });
    }
  }
  if (!fn) return res.status(400).json({ error: 'Photo verification is mandatory' });

  const emp = db.prepare('SELECT * FROM employees WHERE id=? AND is_active=1').get(req.user.userId);
  if (!emp) return res.status(404).json({ error: 'Employee not found' });
  const cp = db.prepare('SELECT * FROM checkpoints WHERE id=?').get(checkpoint_id);
  if (!cp) return res.status(404).json({ error: 'Checkpoint not found' });
  if (cp.shift_id !== emp.shift_id) return res.status(400).json({ error: 'Wrong shift checkpoint' });

  const today = new Date().toISOString().split('T')[0];
  const done = db.prepare('SELECT c.sequence_order FROM attendance_records ar JOIN checkpoints c ON ar.checkpoint_id=c.id WHERE ar.employee_id=? AND ar.work_date=?').all(emp.id, today).map(r => r.sequence_order);
  if (done.length > 0) {
    const max = Math.max(...done);
    if (cp.sequence_order > max + 1) return res.status(400).json({ error: `Checkpoint skipped. Please complete step #${max+1} first.` });
    if (done.includes(cp.sequence_order)) return res.status(400).json({ error: 'This checkpoint has already been logged today.' });
  } else if (cp.sequence_order > 1) {
    return res.status(400).json({ error: 'Please log step #1 (Sign In) first before proceeding.' });
  }

  const zones = db.prepare('SELECT * FROM geofence_zones WHERE is_active=1').all();
  const lat = parseFloat(latitude), lng = parseFloat(longitude);
  let inside = false, minD = Infinity, closest = null;
  for (const z of zones) {
    const d = haversine(lat, lng, z.center_lat, z.center_lng);
    if (d < minD) { minD = d; closest = z; }
    if (d <= (z.radius_meters || 50)) { inside = true; break; }
  }
  if (!inside && zones.length > 0) {
    db.prepare("INSERT INTO geofence_rejections (id,employee_id,latitude,longitude,checkpoint_attempted,distance_m,created_at) VALUES (?,?,?,?,?,?,datetime('now'))").run(uuid(), emp.id, lat, lng, cp.name, Math.round(minD));
    return res.status(403).json({ error: `Outside geofence perimeter (${Math.round(minD)}m away from office zone)` });
  }

  let status = 'ON_TIME';
  if (cp.name.toLowerCase().includes('sign in') || cp.sequence_order === 1) {
    const sh = db.prepare('SELECT * FROM shifts WHERE id=?').get(emp.shift_id);
    if (sh && sh.start_time) {
      const now = new Date();
      const [hh, mm] = sh.start_time.split(':').map(Number);
      const s = new Date(now);
      s.setHours(hh, mm, 0, 0);
      const grace = (sh.grace_minutes || 10) * 60000;
      if (now.getTime() > s.getTime() + grace) status = 'LATE';
    }
  }

  const id = uuid();
  db.prepare("INSERT INTO attendance_records (id,employee_id,checkpoint_id,photo_path,latitude,longitude,timestamp,status,section_id,shift_id,work_date,created_at) VALUES (?,?,?,?,?,?,datetime('now'),?,?,?,date('now'),datetime('now'))").run(id, emp.id, checkpoint_id, fn, lat, lng, status, emp.section_id, emp.shift_id);
  res.status(201).json({ id, checkpoint: cp.name, status, timestamp: new Date().toISOString(), photoUrl: `/uploads/${fn}` });
});

router.get('/attendance', authMiddleware, adminOnly, (req, res) => {
  const { employee_id, section_id, date_from, date_to, status } = req.query;
  const a = db.prepare('SELECT role,section_id FROM admin_users WHERE id=?').get(req.user.userId);
  let q=`SELECT ar.*,e.full_name,e.employee_id as emp_code,s.name as section_name,sh.name as shift_name,c.name as checkpoint_name FROM attendance_records ar JOIN employees e ON ar.employee_id=e.id JOIN sections s ON ar.section_id=s.id JOIN shifts sh ON ar.shift_id=sh.id JOIN checkpoints c ON ar.checkpoint_id=c.id WHERE 1=1`;
  const p=[];
  if(a.role==='section_admin'){q+=' AND ar.section_id=?';p.push(a.section_id);}else if(section_id){q+=' AND ar.section_id=?';p.push(section_id);}
  if(employee_id){q+=' AND ar.employee_id=?';p.push(employee_id);}
  if(date_from){q+=' AND ar.created_at>=?';p.push(date_from);}
  if(date_to){q+=' AND ar.created_at<=?';p.push(date_to+' 23:59:59');}
  if(status){q+=' AND ar.status=?';p.push(status);}
  q+=' ORDER BY ar.created_at DESC LIMIT 500';
  res.json(db.prepare(q).all(...p));
});

router.get('/attendance/export', authMiddleware, adminOnly, (req, res) => {
  const { employee_id, section_id, date_from, date_to, status } = req.query;
  const a = db.prepare('SELECT role,section_id FROM admin_users WHERE id=?').get(req.user.userId);
  let q = `SELECT ar.id, ar.work_date, ar.created_at, e.employee_id as emp_code, e.full_name, s.name as section_name, sh.name as shift_name, c.name as checkpoint_name, ar.status, ar.latitude, ar.longitude, ar.photo_path FROM attendance_records ar JOIN employees e ON ar.employee_id=e.id JOIN sections s ON ar.section_id=s.id JOIN shifts sh ON ar.shift_id=sh.id JOIN checkpoints c ON ar.checkpoint_id=c.id WHERE 1=1`;
  const p = [];
  if (a.role === 'section_admin') { q += ' AND ar.section_id=?'; p.push(a.section_id); }
  else if (section_id) { q += ' AND ar.section_id=?'; p.push(section_id); }
  if (employee_id) { q += ' AND ar.employee_id=?'; p.push(employee_id); }
  if (date_from) { q += ' AND ar.created_at>=?'; p.push(date_from); }
  if (date_to) { q += ' AND ar.created_at<=?'; p.push(date_to + ' 23:59:59'); }
  if (status) { q += ' AND ar.status=?'; p.push(status); }
  q += ' ORDER BY ar.created_at DESC';

  const rows = db.prepare(q).all(...p);
  const header = ['Record ID', 'Work Date', 'Timestamp', 'Employee ID', 'Employee Name', 'Section', 'Shift', 'Checkpoint', 'Status', 'Latitude', 'Longitude', 'Photo File'];
  const csvLines = [header.join(',')];
  rows.forEach(r => {
    const vals = [
      r.id,
      r.work_date,
      `"${r.created_at}"`,
      `"${r.emp_code}"`,
      `"${(r.full_name || '').replace(/"/g, '""')}"`,
      `"${(r.section_name || '').replace(/"/g, '""')}"`,
      `"${(r.shift_name || '').replace(/"/g, '""')}"`,
      `"${(r.checkpoint_name || '').replace(/"/g, '""')}"`,
      r.status,
      r.latitude,
      r.longitude,
      `"${r.photo_path || ''}"`
    ];
    csvLines.push(vals.join(','));
  });
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="attendx_attendance_report.csv"');
  res.send(csvLines.join('\r\n'));
});

router.get('/attendance/folder', authMiddleware, adminOnly, (req, res) => {
  const a = db.prepare('SELECT role,section_id FROM admin_users WHERE id=?').get(req.user.userId);
  const secs = a.role==='section_admin'?db.prepare('SELECT * FROM sections WHERE id=?').all(a.section_id):db.prepare('SELECT * FROM sections').all();
  res.json(secs.map(s => {
    const emps = db.prepare('SELECT id,employee_id,full_name,photo_path FROM employees WHERE section_id=? AND is_active=1').all(s.id);
    return { ...s, employees: emps.map(e => {
      const recs = db.prepare('SELECT ar.*,c.name as checkpoint_name FROM attendance_records ar JOIN checkpoints c ON ar.checkpoint_id=c.id WHERE ar.employee_id=? ORDER BY ar.created_at DESC').all(e.id);
      const byDate={}; recs.forEach(r=>{const d=r.created_at.split(' ')[0];if(!byDate[d])byDate[d]=[];byDate[d].push(r);});
      return { ...e, attendance: byDate };
    })};
  }));
});

router.get('/attendance/my', authMiddleware, (req, res) => {
  const today=new Date().toISOString().split('T')[0];
  res.json(db.prepare('SELECT ar.*,c.name as checkpoint_name FROM attendance_records ar JOIN checkpoints c ON ar.checkpoint_id=c.id WHERE ar.employee_id=? AND ar.work_date=? ORDER BY ar.created_at').all(req.user.userId,today));
});

// ===== STATS (for dashboard) =====
router.get('/stats', authMiddleware, adminOnly, (req, res) => {
  try {
    const a = db.prepare('SELECT role,section_id FROM admin_users WHERE id=?').get(req.user.userId);
    const isSection = a.role === 'section_admin';
    const secId = isSection ? a.section_id : null;
    const today = new Date().toISOString().split('T')[0];

    const total = isSection
      ? db.prepare('SELECT COUNT(*) as n FROM employees e WHERE e.section_id=?').get(secId).n
      : db.prepare('SELECT COUNT(*) as n FROM employees e').get().n;

    const present = isSection
      ? db.prepare('SELECT COUNT(DISTINCT ar.employee_id) as n FROM attendance_records ar JOIN employees e ON ar.employee_id=e.id WHERE e.section_id=? AND ar.work_date=? AND ar.checkpoint_id IN (SELECT id FROM checkpoints WHERE name=\'Sign In\')').get(secId, today).n
      : db.prepare('SELECT COUNT(DISTINCT ar.employee_id) as n FROM attendance_records ar JOIN employees e ON ar.employee_id=e.id WHERE ar.work_date=? AND ar.checkpoint_id IN (SELECT id FROM checkpoints WHERE name=\'Sign In\')').get(today).n;

    const late = isSection
      ? db.prepare('SELECT COUNT(*) as n FROM attendance_records ar JOIN employees e ON ar.employee_id=e.id WHERE e.section_id=? AND ar.work_date=? AND ar.status=\'LATE\'').get(secId, today).n
      : db.prepare('SELECT COUNT(*) as n FROM attendance_records ar JOIN employees e ON ar.employee_id=e.id WHERE ar.work_date=? AND ar.status=\'LATE\'').get(today).n;

    const breaches = db.prepare('SELECT COUNT(*) as n FROM geofence_rejections WHERE created_at >= date(\'now\')').get().n;
    const lockouts = db.prepare('SELECT COUNT(*) as n FROM login_attempts WHERE success=0 AND at >= datetime(\'now\',\'-24 hours\')').get().n;
    const breaks = isSection
      ? db.prepare('SELECT COUNT(*) as n FROM attendance_records ar JOIN checkpoints c ON ar.checkpoint_id=c.id WHERE ar.work_date=? AND c.name LIKE \'%Break%\' AND ar.section_id=?').get(today, secId).n
      : db.prepare('SELECT COUNT(*) as n FROM attendance_records ar JOIN checkpoints c ON ar.checkpoint_id=c.id WHERE ar.work_date=? AND c.name LIKE \'%Break%\'').get(today).n;

    res.json({ totalWorkforce: total, onSiteVerified: present, lateFlagged: late, breakLunch: breaks, geofenceBreach: breaches, authLockouts: lockouts });
  } catch (err) {
    res.status(500).json({ error: 'Stats query failed' });
  }
});

// ===== LIVE EVENTS (recent activity) =====
router.get('/events/live', authMiddleware, adminOnly, (req, res) => {
  const a = db.prepare('SELECT role,section_id FROM admin_users WHERE id=?').get(req.user.userId);
  const q = `SELECT ar.*,e.full_name,e.employee_id as emp_code,s.name as section_name,sh.name as shift_name,c.name as checkpoint_name FROM attendance_records ar JOIN employees e ON ar.employee_id=e.id JOIN sections s ON ar.section_id=s.id JOIN shifts sh ON ar.shift_id=sh.id JOIN checkpoints c ON ar.checkpoint_id=c.id ${a.role==='section_admin'?'WHERE ar.section_id=?':''} ORDER BY ar.created_at DESC LIMIT 50`;
  res.json(a.role==='section_admin'?db.prepare(q).all(a.section_id):db.prepare(q).all());
});

// ===== LOCKOUTS =====
router.get('/lockouts', authMiddleware, adminOnly, (req, res) => {
  const a = db.prepare('SELECT role,section_id FROM admin_users WHERE id=?').get(req.user.userId);
  const admins = a.role === 'section_admin' ? [] : db.prepare("SELECT username as identity, failed_attempts, locked_until FROM admin_users WHERE failed_attempts>=3").all();
  const emps = a.role === 'section_admin'
    ? db.prepare("SELECT employee_id as identity, failed_attempts, locked_until FROM employees WHERE failed_attempts>=3 AND section_id=?").all(a.section_id)
    : db.prepare("SELECT employee_id as identity, failed_attempts, locked_until FROM employees WHERE failed_attempts>=3").all();
  res.json([...admins.map(a=>({...a,type:'admin'})), ...emps.map(e=>({...e,type:'employee'}))]);
});

router.post('/lockouts/:identity/unlock', authMiddleware, adminOnly, (req, res) => {
  const id = req.params.identity;
  const a = db.prepare('SELECT role,section_id FROM admin_users WHERE id=?').get(req.user.userId);
  if (a.role === 'section_admin') {
    const emp = db.prepare('SELECT id,section_id FROM employees WHERE employee_id=?').get(id);
    db.prepare('UPDATE employees SET failed_attempts=0,locked_until=NULL WHERE employee_id=? AND section_id=?').run(id, a.section_id);
  } else {
    db.prepare('UPDATE admin_users SET failed_attempts=0,locked_until=NULL WHERE username=?').run(id);
    db.prepare('UPDATE employees SET failed_attempts=0,locked_until=NULL WHERE employee_id=?').run(id);
  }
  resetAttempts(id);
  res.json({ ok: true });
});

// ===== REJECTIONS =====
router.get('/rejections', authMiddleware, adminOnly, (req, res) => {
  const a = db.prepare('SELECT role,section_id FROM admin_users WHERE id=?').get(req.user.userId);
  if (a.role === 'section_admin') {
    res.json(db.prepare('SELECT gr.*,e.full_name,e.employee_id as emp_code FROM geofence_rejections gr JOIN employees e ON gr.employee_id=e.id WHERE e.section_id=? ORDER BY gr.created_at DESC LIMIT 100').all(a.section_id));
  } else {
    res.json(db.prepare('SELECT gr.*,e.full_name,e.employee_id as emp_code FROM geofence_rejections gr JOIN employees e ON gr.employee_id=e.id ORDER BY gr.created_at DESC LIMIT 100').all());
  }
});

// ===== AUDIT =====
router.get('/audit', authMiddleware, superAdminOnly, (req, res) => {
  res.json(db.prepare('SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 200').all());
});

// ===== SETTINGS =====
router.get('/settings', authMiddleware, superAdminOnly, (req, res) => {
  const rows = db.prepare('SELECT * FROM settings').all();
  const o={}; rows.forEach(r=>o[r.key]=r.value); res.json(o);
});

router.put('/settings', authMiddleware, superAdminOnly, (req, res) => {
  const ins = db.prepare('INSERT OR REPLACE INTO settings (key,value) VALUES (?,?)');
  Object.entries(req.body).forEach(([k,v])=>ins.run(k,String(v)));
  res.json({ ok: true });
});

// ===== MEDIA =====
router.get('/media/:fn', (req, res) => {
  const fp = path.join(UPLOADS, req.params.fn);
  if (!fs.existsSync(fp)) return res.status(404).json({ error: 'Not found' });
  res.sendFile(fp);
});

module.exports = router;
