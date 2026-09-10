'use strict';
// Employee profile, consent, and geofence validation (with immutable rejection log).
// ALL routes require an unlocked session (re-lock blocks everything).
const express = require('express');
const { getSetting, audit } = require('./db');
const { db } = require('./schema');
const { requireSession, requireUnlocked } = require('./routes-auth');

const r = express.Router();
const empGuard = [requireSession, requireUnlocked];

function myEmployee(req) {
  return db.prepare('SELECT * FROM employees WHERE id=?').get(req.session.ref_id);
}

function zoneFor(emp) {
  return db.prepare(
    'SELECT * FROM geofence_zones WHERE active=1 AND (section_id IS NULL OR section_id=?) ORDER BY section_id LIMIT 1'
  ).get(emp.section_id);
}

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371000, toR = x => x * Math.PI / 180;
  const dLat = toR(lat2 - lat1), dLon = toR(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toR(lat1)) * Math.cos(toR(lat2)) * Math.sin(dLon / 2) ** 2;
  return Math.round(2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function logRejection(e, cpName, lat, lng, dist, zone) {
  db.prepare(`INSERT INTO geofence_rejections
    (employee_id, employee_code, section_id, checkpoint_name, latitude, longitude, distance_m, zone_id, zone_name)
    VALUES (?,?,?,?,?,?,?,?,?)`)
    .run(e.id, e.employee_id, e.section_id, cpName || null, lat, lng, dist, zone.id, zone.name);
  audit('GEOFENCE_REJECT', e.employee_id, 'EMPLOYEE', { distance_m: dist, zone: zone.name });
}

r.get('/me', ...empGuard, (req, res) => {
  const e = myEmployee(req);
  if (!e) return res.status(404).json({ error: 'Employee profile not found.' });
  const sec = db.prepare('SELECT name FROM sections WHERE id=?').get(e.section_id);
  const sh = db.prepare('SELECT * FROM shifts WHERE id=?').get(e.shift_id);
  sh.checkpoints = db.prepare('SELECT * FROM checkpoints WHERE shift_id=? ORDER BY sequence').all(sh.id);
  const today = new Date().toISOString().slice(0, 10);
  const done = db.prepare(
    `SELECT ar.*, c.kind FROM attendance_records ar JOIN checkpoints c ON c.id=ar.checkpoint_id
     WHERE ar.employee_id=? AND ar.work_date=? ORDER BY ar.sequence`).all(e.id, today);
  res.json({
    employee_id: e.employee_id, name: e.name, section: sec.name,
    consent_given: !!e.consent_given, shift: sh, today_records: done,
    retention_days: parseInt(getSetting('data_retention_days') || '180', 10),
  });
});

r.post('/consent', ...empGuard, (req, res) => {
  const e = myEmployee(req);
  const accepted = req.body && req.body.accepted ? 1 : 0;
  db.prepare('UPDATE employees SET consent_given=?, consent_at=? WHERE id=?')
    .run(accepted, new Date().toISOString(), e.id);
  db.prepare('INSERT INTO consents (employee_id, accepted, text_snapshot) VALUES (?,?,?)')
    .run(e.id, accepted, 'Photo & location capture consent');
  audit('CONSENT', e.employee_id, 'EMPLOYEE', { accepted: !!accepted });
  res.json({ ok: true });
});

// Employee-visible shift list (used for shift-swap requests). Scoped to the
// employee's section: global shifts plus their section's shifts only.
r.get('/shifts', ...empGuard, (req, res) => {
  const e = myEmployee(req);
  const rows = db.prepare(
    'SELECT id, name, start_time, end_time FROM shifts WHERE section_id IS NULL OR section_id=? ORDER BY start_time'
  ).all(e.section_id);
  res.json({ shifts: rows });
});

r.post('/geofence/check', ...empGuard, (req, res) => {
  const e = myEmployee(req);
  const { latitude, longitude, accuracy, checkpoint_name } = req.body || {};
  const zone = zoneFor(e);
  if (!zone) return res.json({ inside: true, zone: null, note: 'No geofence configured.' });
  const dist = haversine(parseFloat(latitude), parseFloat(longitude), zone.latitude, zone.longitude);
  const inside = dist <= zone.radius_m + (parseFloat(accuracy) || 0) * 0.5;
  if (!inside) {
    logRejection(e, checkpoint_name, parseFloat(latitude), parseFloat(longitude), dist, zone);
  }
  res.json({
    inside, distance_m: dist, zone,
    message: inside ? '' : `You are outside the office location (${zone.name}). Move within ${zone.radius_m} m to continue.`,
  });
});

module.exports = { router: r, empGuard, myEmployee, zoneFor, haversine, logRejection };
