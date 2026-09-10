'use strict';
// Ordered checkpoints (expandable beyond default 8) and geofence zones.
const express = require('express');
const { db, audit } = require('./db');
const { guard, assertSuper } = require('./scope');

const r = express.Router();
r.use(...guard);

// ---- Checkpoints ----
r.post('/shifts/:id/checkpoints', (req, res) => {
  if (!assertSuper(req, res)) return;
  const { name } = req.body || {};
  if (!name) return res.status(400).json({ error: 'Checkpoint name required.' });
  const maxSeq = db.prepare('SELECT MAX(sequence) AS m FROM checkpoints WHERE shift_id=?').get(req.params.id).m || 0;
  const id = db.prepare('INSERT INTO checkpoints (shift_id, name, sequence, kind) VALUES (?,?,?,?)')
    .run(req.params.id, name, maxSeq + 1, 'CUSTOM').lastInsertRowid;
  audit('CHECKPOINT_ADD', req.session.display_id, 'SUPER_ADMIN', { shift_id: +req.params.id, name });
  res.json({ ok: true, id, sequence: maxSeq + 1 });
});

r.delete('/checkpoints/:id', (req, res) => {
  if (!assertSuper(req, res)) return;
  const cp = db.prepare('SELECT * FROM checkpoints WHERE id=?').get(req.params.id);
  if (!cp) return res.status(404).json({ error: 'Checkpoint not found.' });
  const used = db.prepare('SELECT COUNT(*) AS n FROM attendance_records WHERE checkpoint_id=?').get(cp.id).n;
  if (used > 0) return res.status(400).json({ error: 'Checkpoint has attendance history and cannot be deleted.' });
  db.prepare('DELETE FROM checkpoints WHERE id=?').run(cp.id);
  audit('CHECKPOINT_DELETE', req.session.display_id, 'SUPER_ADMIN', { id: cp.id });
  res.json({ ok: true });
});

// ---- Geofence zones ----
r.get('/geofences', (req, res) => {
  const admin = db.prepare('SELECT * FROM admins WHERE id=?').get(req.session.ref_id);
  const rows = admin.role === 'SUPER_ADMIN'
    ? db.prepare('SELECT * FROM geofence_zones ORDER BY name').all()
    : db.prepare('SELECT * FROM geofence_zones WHERE section_id IS NULL OR section_id=? ORDER BY name').all(admin.section_id);
  res.json({ zones: rows });
});

r.post('/geofences', (req, res) => {
  if (!assertSuper(req, res)) return;
  const { name, latitude, longitude, radius_m } = req.body || {};
  const lat = parseFloat(latitude), lng = parseFloat(longitude), rad = parseInt(radius_m || 50, 10);
  if (!name || Number.isNaN(lat) || Number.isNaN(lng)) {
    return res.status(400).json({ error: 'Name and valid coordinates required.' });
  }
  if (!(rad >= 20 && rad <= 5000)) {
    return res.status(400).json({ error: 'Radius must be 20-5000 meters (below 20m constantly false-fails on phone GPS).' });
  }
  const id = db.prepare('INSERT INTO geofence_zones (name, latitude, longitude, radius_m) VALUES (?,?,?,?)')
    .run(name, lat, lng, rad).lastInsertRowid;
  audit('GEOFENCE_CREATE', req.session.display_id, 'SUPER_ADMIN', { name, radius: rad });
  res.json({ ok: true, id });
});

r.put('/geofences/:id', (req, res) => {
  if (!assertSuper(req, res)) return;
  const z = db.prepare('SELECT * FROM geofence_zones WHERE id=?').get(req.params.id);
  if (!z) return res.status(404).json({ error: 'Zone not found.' });
  const b = req.body || {};
  const rad = parseInt(b.radius_m ?? z.radius_m, 10);
  if (!(rad >= 20 && rad <= 5000)) return res.status(400).json({ error: 'Radius must be 20-5000 meters.' });
  db.prepare('UPDATE geofence_zones SET name=?, latitude=?, longitude=?, radius_m=?, active=? WHERE id=?')
    .run(b.name ?? z.name, b.latitude ?? z.latitude, b.longitude ?? z.longitude, rad,
      b.active === undefined ? z.active : (b.active ? 1 : 0), z.id);
  audit('GEOFENCE_UPDATE', req.session.display_id, 'SUPER_ADMIN', { id: z.id });
  res.json({ ok: true });
});

module.exports = { router: r };
