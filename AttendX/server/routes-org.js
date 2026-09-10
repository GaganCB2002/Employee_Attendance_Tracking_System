'use strict';
// Org config: sections and shifts (6 configurable per day, expandable).
const express = require('express');
const { db, ensureDefaultCheckpoints, audit } = require('./db');
const { guard, assertSuper } = require('./scope');

const r = express.Router();
r.use(...guard);

r.get('/sections', (req, res) => {
  const admin = db.prepare('SELECT * FROM admins WHERE id=?').get(req.session.ref_id);
  const rows = admin.role === 'SUPER_ADMIN'
    ? db.prepare('SELECT * FROM sections ORDER BY name').all()
    : db.prepare('SELECT * FROM sections WHERE id=? ORDER BY name').all(admin.section_id);
  res.json({ sections: rows });
});

r.post('/sections', (req, res) => {
  if (!assertSuper(req, res)) return;
  const { name, description } = req.body || {};
  if (!name) return res.status(400).json({ error: 'Section name required.' });
  try {
    const id = db.prepare('INSERT INTO sections (name, description) VALUES (?,?)')
      .run(name, description || '').lastInsertRowid;
    audit('SECTION_CREATE', req.session.display_id, 'SUPER_ADMIN', { name });
    res.json({ ok: true, id });
  } catch (e) { res.status(400).json({ error: 'Section name already exists.' }); }
});

r.get('/shifts', (req, res) => {
  const admin = db.prepare('SELECT * FROM admins WHERE id=?').get(req.session.ref_id);
  const rows = admin.role === 'SUPER_ADMIN'
    ? db.prepare('SELECT * FROM shifts ORDER BY start_time').all()
    : db.prepare('SELECT * FROM shifts WHERE section_id IS NULL OR section_id=? ORDER BY start_time').all(admin.section_id);
  for (const sh of rows) {
    sh.checkpoints = db.prepare('SELECT * FROM checkpoints WHERE shift_id=? ORDER BY sequence').all(sh.id);
  }
  res.json({ shifts: rows });
});

r.post('/shifts', (req, res) => {
  if (!assertSuper(req, res)) return;
  const { name, start_time, end_time, late_grace_minutes } = req.body || {};
  if (!name || !start_time || !end_time) return res.status(400).json({ error: 'Name, start and end times are required.' });
  const grace = parseInt(late_grace_minutes ?? 10, 10);
  if (!(grace >= 0 && grace <= 120)) return res.status(400).json({ error: 'Grace period must be 0-120 minutes.' });
  const id = db.prepare('INSERT INTO shifts (name, start_time, end_time, late_grace_minutes) VALUES (?,?,?,?)')
    .run(name, start_time, end_time, grace).lastInsertRowid;
  ensureDefaultCheckpoints(id);
  audit('SHIFT_CREATE', req.session.display_id, 'SUPER_ADMIN', { name });
  res.json({ ok: true, id });
});

r.put('/shifts/:id', (req, res) => {
  if (!assertSuper(req, res)) return;
  const sh = db.prepare('SELECT * FROM shifts WHERE id=?').get(req.params.id);
  if (!sh) return res.status(404).json({ error: 'Shift not found.' });
  const b = req.body || {};
  const grace = parseInt(b.late_grace_minutes ?? sh.late_grace_minutes, 10);
  if (!(grace >= 0 && grace <= 120)) return res.status(400).json({ error: 'Grace period must be 0-120 minutes.' });
  db.prepare('UPDATE shifts SET name=?, start_time=?, end_time=?, late_grace_minutes=? WHERE id=?')
    .run(b.name ?? sh.name, b.start_time ?? sh.start_time, b.end_time ?? sh.end_time, grace, sh.id);
  audit('SHIFT_UPDATE', req.session.display_id, 'SUPER_ADMIN', { id: sh.id });
  res.json({ ok: true });
});

module.exports = { router: r };
