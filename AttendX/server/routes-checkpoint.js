'use strict';
// Checkpoint submission (mandatory photo, ordered, late detection), history,
// media streaming, CSV export, and shift-swap requests.
const express = require('express');
const { db, audit } = require('./db');
const { writeEncrypted, readEncrypted } = require('./crypto');
const { empGuard, myEmployee, zoneFor, haversine, logRejection } = require('./routes-employee');

const r = express.Router();

r.post('/checkpoint', ...empGuard, (req, res) => {
  const e = myEmployee(req);
  const { checkpoint_id, latitude, longitude, accuracy, client_time, media_b64, media_type } = req.body || {};
  if (!e.active) return res.status(403).json({ error: 'Account deactivated.' });
  if (!e.consent_given) return res.status(403).json({ error: 'Consent for photo & location capture is required first.' });
  const cp = db.prepare('SELECT * FROM checkpoints WHERE id=? AND shift_id=?').get(checkpoint_id, e.shift_id);
  if (!cp) return res.status(400).json({ error: 'Checkpoint not in your shift plan.' });
  if (!media_b64) {
    return res.status(400).json({ error: 'Photo/video capture is required. Capture failed - please retry.' });
  }
  const zone = zoneFor(e);
  if (zone) {
    const dist = haversine(parseFloat(latitude), parseFloat(longitude), zone.latitude, zone.longitude);
    if (dist > zone.radius_m + (parseFloat(accuracy) || 0) * 0.5) {
      logRejection(e, cp.name, parseFloat(latitude), parseFloat(longitude), dist, zone);
      return res.status(403).json({ error: `You are outside the office location (${zone.name}).` });
    }
  }
  const today = new Date().toISOString().slice(0, 10);
  const already = db.prepare(
    'SELECT id FROM attendance_records WHERE employee_id=? AND work_date=? AND checkpoint_id=?'
  ).get(e.id, today, cp.id);
  if (already) return res.status(409).json({ error: `${cp.name} is already logged for today.` });
  const last = db.prepare(
    'SELECT MAX(sequence) AS m FROM attendance_records WHERE employee_id=? AND work_date=?'
  ).get(e.id, today).m || 0;
  if (cp.sequence !== last + 1) {
    return res.status(409).json({ error: `Checkpoints must be done in order. Next required: sequence ${last + 1}.` });
  }
  // Late detection (Sign In vs scheduled start + grace).
  let status = 'ON_TIME';
  const sched = db.prepare('SELECT * FROM shifts WHERE id=?').get(e.shift_id);
  const stamp = client_time && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(client_time) ? new Date(client_time) : new Date();
  if (cp.kind === 'SIGN_IN') {
    const [h, m] = sched.start_time.split(':').map(Number);
    const start = new Date(stamp); start.setHours(h, m, 0, 0);
    const deadline = new Date(start.getTime() + sched.late_grace_minutes * 60000);
    if (stamp > deadline) status = 'LATE';
  }
  let uuid;
  try {
    const buf = Buffer.from(String(media_b64).split(',')[1] || '', 'base64');
    if (!buf.length) return res.status(400).json({ error: 'Capture failed. Please retry.' });
    uuid = 'cp' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    writeEncrypted(uuid, buf);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to store capture. Please retry.' });
  }
  const timeStr = `${String(stamp.getHours()).padStart(2, '0')}:${String(stamp.getMinutes()).padStart(2, '0')}`;
  const recId = db.prepare(`INSERT INTO attendance_records
    (employee_id, shift_id, checkpoint_id, checkpoint_name, work_date, checkpoint_time, status,
     latitude, longitude, accuracy_m, media_uuid, media_type, sequence)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .run(e.id, e.shift_id, cp.id, cp.name, today, timeStr, status, parseFloat(latitude),
      parseFloat(longitude), parseFloat(accuracy) || null, uuid, media_type || 'image/jpeg', cp.sequence)
    .lastInsertRowid;
  audit('CHECKPOINT_LOG', e.employee_id, 'EMPLOYEE', { cp: cp.name, status, date: today });
  res.json({ ok: true, id: recId, status, time: timeStr, checkpoint: cp.name, sequence: cp.sequence });
});

r.get('/history', ...empGuard, (req, res) => {
  const e = myEmployee(req);
  const from = req.query.from || '2000-01-01', to = req.query.to || '2999-12-31';
  res.json({ records: db.prepare(
    'SELECT * FROM attendance_records WHERE employee_id=? AND work_date BETWEEN ? AND ? ORDER BY work_date DESC, sequence'
  ).all(e.id, from, to) });
});

r.get('/media/:uuid', ...empGuard, (req, res) => {
  const rec = db.prepare('SELECT media_uuid FROM attendance_records WHERE media_uuid=? AND employee_id=?')
    .get(req.params.uuid, req.session.ref_id);
  if (!rec) return res.status(404).json({ error: 'Media not found.' });
  try {
    res.set('Content-Type', 'image/jpeg');
    res.send(readEncrypted(rec.media_uuid));
  } catch (e2) { res.status(404).json({ error: 'Media unavailable.' }); }
});

r.get('/export.csv', ...empGuard, (req, res) => {
  const e = myEmployee(req);
  const rows = db.prepare('SELECT * FROM attendance_records WHERE employee_id=? ORDER BY work_date, sequence').all(e.id);
  const head = 'date,checkpoint,time,status,latitude,longitude';
  const body = rows.map(x =>
    [x.work_date, `"${x.checkpoint_name}"`, x.checkpoint_time, x.status, x.latitude, x.longitude].join(','));
  res.set('Content-Type', 'text/csv');
  res.set('Content-Disposition', `attachment; filename="my_attendance_${e.employee_id}.csv"`);
  res.send([head, ...body].join('\n'));
});

r.post('/swap-request', ...empGuard, (req, res) => {
  const e = myEmployee(req);
  const { to_shift_id, work_date, reason } = req.body || {};
  if (!to_shift_id || !work_date) return res.status(400).json({ error: 'Target shift and date required.' });
  db.prepare('INSERT INTO shift_swaps (employee_id, from_shift_id, to_shift_id, work_date, reason) VALUES (?,?,?,?,?)')
    .run(e.id, e.shift_id, to_shift_id, work_date, reason || '');
  audit('SWAP_REQUEST', e.employee_id, 'EMPLOYEE', { to: to_shift_id, date: work_date });
  res.json({ ok: true });
});

module.exports = { router: r };
