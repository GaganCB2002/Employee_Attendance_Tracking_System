'use strict';
// Admin dashboards: folder-wise Section > Employee > Date > Checkpoint tree
// and media decryption endpoints (scope-checked).
const express = require('express');
const { db } = require('./db');
const { readEncrypted } = require('./crypto');
const { guard, adminOf } = require('./scope');

const r = express.Router();
r.use(...guard);

function scopedWhere(req) {
  const admin = adminOf(req);
  return admin.role === 'SUPER_ADMIN'
    ? { clause: '', args: [], super: true }
    : { clause: 'AND e.section_id = ?', args: [admin.section_id], super: false };
}

// Folder-wise tree: Section -> Employee -> Date -> Checkpoints.
r.get('/dashboard', (req, res) => {
  const sc = scopedWhere(req);
  const { from, to, section_id, employee_id, date } = req.query;
  let where = 'WHERE 1=1';
  const args = [];
  if (!sc.super) { where += ' AND e.section_id = ?'; args.push(sc.args[0]); }
  if (section_id) { where += ' AND e.section_id = ?'; args.push(section_id); }
  if (employee_id) { where += ' AND e.id = ?'; args.push(employee_id); }
  if (from && to) { where += ' AND ar.work_date BETWEEN ? AND ?'; args.push(from, to); }
  else if (date) { where += ' AND ar.work_date = ?'; args.push(date); }
  const rows = db.prepare(
    `SELECT ar.id, ar.work_date, ar.checkpoint_time, ar.status, ar.checkpoint_name, ar.sequence,
            ar.latitude, ar.longitude, ar.accuracy_m, ar.media_uuid, ar.media_type,
            e.employee_id AS emp_code, e.name AS emp_name, e.section_id,
            s.name AS section_name, sh.name AS shift_name, sh.start_time, sh.late_grace_minutes
     FROM attendance_records ar
     JOIN employees e ON e.id = ar.employee_id
     JOIN sections s ON s.id = e.section_id
     JOIN shifts sh ON sh.id = ar.shift_id
     ${where}
     ORDER BY s.name, e.employee_id, ar.work_date DESC, ar.sequence
     LIMIT 5000`).all(...args);
  const tree = {};
  for (const x of rows) {
    const t = tree[x.section_name] = tree[x.section_name] || { employees: {}, late_count: 0 };
    const em = t.employees[x.emp_code] = t.employees[x.emp_code] || { name: x.emp_name, dates: {} };
    const d = em.dates[x.work_date] = em.dates[x.work_date] || { checkpoints: [], late_count: 0 };
    d.checkpoints.push(x);
    if (x.status === 'LATE') { d.late_count++; t.late_count++; }
  }
  res.json({ tree, total: rows.length, role: adminOf(req).role });
});

// Flat record list (for tables + late-only filters).
r.get('/records', (req, res) => {
  const sc = scopedWhere(req);
  const { from, to, date, late_only, section_id } = req.query;
  let where = 'WHERE 1=1';
  const args = [];
  if (!sc.super) { where += ' AND e.section_id = ?'; args.push(sc.args[0]); }
  if (section_id) { where += ' AND e.section_id = ?'; args.push(section_id); }
  if (from && to) { where += ' AND ar.work_date BETWEEN ? AND ?'; args.push(from, to); }
  else if (date) { where += ' AND ar.work_date = ?'; args.push(date); }
  if (late_only === '1') where += ` AND ar.status = 'LATE'`;
  const rows = db.prepare(
    `SELECT ar.*, e.employee_id AS emp_code, e.name AS emp_name, s.name AS section_name,
            sh.name AS shift_name, sh.start_time, sh.late_grace_minutes
     FROM attendance_records ar
     JOIN employees e ON e.id = ar.employee_id
     JOIN sections s ON s.id = e.section_id
     JOIN shifts sh ON sh.id = ar.shift_id
     ${where} ORDER BY ar.work_date DESC, ar.id DESC LIMIT 5000`).all(...args);
  res.json({ records: rows });
});

// Media decryption endpoint (admins: any capture within their scope).
r.get('/media/:uuid', (req, res) => {
  const sc = scopedWhere(req);
  const rec = db.prepare(
    `SELECT ar.media_uuid, ar.media_type, e.section_id FROM attendance_records ar
     JOIN employees e ON e.id = ar.employee_id WHERE ar.media_uuid=?`).get(req.params.uuid);
  if (!rec || (!sc.super && rec.section_id !== sc.args[0])) {
    return res.status(404).json({ error: 'Media not found.' });
  }
  try {
    res.set('Content-Type', rec.media_type || 'image/jpeg');
    res.send(readEncrypted(rec.media_uuid));
  } catch (e) { res.status(404).json({ error: 'Media unavailable.' }); }
});

// Employee profile photo (admin view).
r.get('/photo/:empId', (req, res) => {
  const sc = scopedWhere(req);
  const e = db.prepare('SELECT profile_photo, section_id FROM employees WHERE employee_id=?').get(req.params.empId);
  if (!e || !e.profile_photo || (!sc.super && e.section_id !== sc.args[0])) {
    return res.status(404).json({ error: 'No profile photo.' });
  }
  try {
    res.set('Content-Type', 'image/jpeg');
    res.send(readEncrypted(e.profile_photo));
  } catch (err) { res.status(404).json({ error: 'Photo unavailable.' }); }
});

module.exports = { router: r };
