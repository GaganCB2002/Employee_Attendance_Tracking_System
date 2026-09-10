'use strict';
// Admin exports (CSV/Excel-compatible) and analytics dashboard data.
const express = require('express');
const { db, audit } = require('./db');
const { guard } = require('./scope');

const r = express.Router();
r.use(...guard);

r.get('/export.csv', (req, res) => {
  const admin = db.prepare('SELECT * FROM admins WHERE id=?').get(req.session.ref_id);
  const { from, to, date, late_only, section_id } = req.query;
  let where = 'WHERE 1=1';
  const args = [];
  if (admin.role !== 'SUPER_ADMIN') { where += ' AND e.section_id = ?'; args.push(admin.section_id); }
  if (section_id) { where += ' AND e.section_id = ?'; args.push(section_id); }
  if (from && to) { where += ' AND ar.work_date BETWEEN ? AND ?'; args.push(from, to); }
  else if (date) { where += ' AND ar.work_date = ?'; args.push(date); }
  if (late_only === '1') where += ` AND ar.status = 'LATE'`;
  const rows = db.prepare(
    `SELECT ar.*, e.employee_id AS emp_code, e.name AS emp_name, s.name AS section_name, sh.name AS shift_name
     FROM attendance_records ar
     JOIN employees e ON e.id = ar.employee_id
     JOIN sections s ON s.id = e.section_id
     JOIN shifts sh ON sh.id = ar.shift_id
     ${where} ORDER BY ar.work_date DESC, ar.id DESC`).all(...args);
  const head = 'date,employee_id,employee_name,section,shift,checkpoint,time,status,latitude,longitude,media';
  const esc = v => `"${String(v).replace(/"/g, '""')}"`;
  const body = rows.map(x => [x.work_date, x.emp_code, esc(x.emp_name), esc(x.section_name),
    esc(x.shift_name), esc(x.checkpoint_name), x.checkpoint_time, x.status,
    x.latitude, x.longitude, `/api/admin/media/${x.media_uuid}`].join(','));
  audit('EXPORT_CSV', admin.admin_id, admin.role, { rows: rows.length });
  res.set('Content-Type', 'text/csv');
  res.set('Content-Disposition', 'attachment; filename="attendance_export.csv"');
  res.send([head, ...body].join('\n'));
});

r.get('/analytics', (req, res) => {
  const admin = db.prepare('SELECT * FROM admins WHERE id=?').get(req.session.ref_id);
  const secFilter = admin.role === 'SUPER_ADMIN' ? '' : 'AND e.section_id = ?';
  const args = admin.role === 'SUPER_ADMIN' ? [] : [admin.section_id];
  const byDay = db.prepare(
    `SELECT ar.work_date AS d,
            SUM(CASE WHEN ar.status='LATE' THEN 1 ELSE 0 END) AS late,
            COUNT(*) AS total
     FROM attendance_records ar JOIN employees e ON e.id=ar.employee_id
     WHERE ar.checkpoint_name LIKE 'Sign In%' ${secFilter}
     GROUP BY ar.work_date ORDER BY ar.work_date DESC LIMIT 30`).all(...args);
  const bySection = db.prepare(
    `SELECT s.name AS section,
            SUM(CASE WHEN ar.status='LATE' THEN 1 ELSE 0 END) AS late,
            COUNT(*) AS total
     FROM attendance_records ar
     JOIN employees e ON e.id=ar.employee_id
     JOIN sections s ON s.id=e.section_id
     WHERE ar.checkpoint_name LIKE 'Sign In%' ${secFilter}
     GROUP BY s.name`).all(...args);
  res.json({ byDay, bySection });
});

module.exports = { router: r };
