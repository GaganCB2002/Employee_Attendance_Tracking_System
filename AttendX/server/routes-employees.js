'use strict';
// Employee onboarding & management: add (with consent), edit, deactivate, reassign.
const express = require('express');
const { db, audit } = require('./db');
const { hashPassword, genPassword, writeEncrypted } = require('./crypto');
const { guard, assertSectionAccess, employeeRow } = require('./scope');

const r = express.Router();
r.use(...guard);

r.get('/', (req, res) => {
  const admin = db.prepare('SELECT * FROM admins WHERE id=?').get(req.session.ref_id);
  const rows = admin.role === 'SUPER_ADMIN'
    ? db.prepare('SELECT * FROM employees ORDER BY employee_id').all()
    : db.prepare('SELECT * FROM employees WHERE section_id=? ORDER BY employee_id').all(admin.section_id);
  res.json({ employees: rows.map(employeeRow) });
});

r.post('/', (req, res) => {
  const admin = db.prepare('SELECT * FROM admins WHERE id=?').get(req.session.ref_id);
  const b = req.body || {};
  if (!b.name || !b.employee_id || !b.section_id || !b.shift_id) {
    return res.status(400).json({ error: 'Name, Employee ID, section and shift are required.' });
  }
  try { assertSectionAccess(req, b.section_id); } catch (e) {
    return res.status(403).json({ error: 'You can only add employees to your own section.' });
  }
  if (db.prepare('SELECT id FROM employees WHERE employee_id=?').get(b.employee_id)
    || db.prepare('SELECT id FROM admins WHERE admin_id=?').get(b.employee_id)) {
    return res.status(400).json({ error: 'Duplicate ID: an account with this ID already exists.' });
  }
  const pw = b.password && String(b.password).length >= 6 ? String(b.password) : genPassword();
  const id = db.prepare(
    'INSERT INTO employees (employee_id, name, section_id, shift_id, password_hash, consent_given, consent_at) VALUES (?,?,?,?,?,?,?)'
  ).run(b.employee_id, b.name, b.section_id, b.shift_id, hashPassword(pw),
    b.consent ? 1 : 0, b.consent ? new Date().toISOString() : null).lastInsertRowid;
  if (b.profile_photo_dataurl) {
    try {
      const buf = Buffer.from(String(b.profile_photo_dataurl).split(',')[1], 'base64');
      const uuid = 'pf' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
      writeEncrypted(uuid, buf);
      db.prepare('UPDATE employees SET profile_photo=? WHERE id=?').run(uuid, id);
    } catch (e) { /* profile photo is optional */ }
  }
  audit('EMPLOYEE_CREATE', req.session.display_id, admin.role, { employee_id: b.employee_id });
  res.json({ ok: true, id, generated_password: b.password ? undefined : pw });
});

r.put('/:id', (req, res) => {
  const admin = db.prepare('SELECT * FROM admins WHERE id=?').get(req.session.ref_id);
  const e = db.prepare('SELECT * FROM employees WHERE id=?').get(req.params.id);
  if (!e) return res.status(404).json({ error: 'Employee not found.' });
  try {
    assertSectionAccess(req, e.section_id);
    if (req.body && req.body.section_id) assertSectionAccess(req, req.body.section_id);
  } catch (err) {
    return res.status(403).json({ error: 'You can only manage employees in your own section.' });
  }
  const b = req.body || {};
  db.prepare('UPDATE employees SET name=?, section_id=?, shift_id=? WHERE id=?')
    .run(b.name ?? e.name, b.section_id ?? e.section_id, b.shift_id ?? e.shift_id, e.id);
  if (b.active !== undefined) db.prepare('UPDATE employees SET active=? WHERE id=?').run(b.active ? 1 : 0, e.id);
  if (b.password && String(b.password).length >= 6) {
    db.prepare('UPDATE employees SET password_hash=? WHERE id=?').run(hashPassword(b.password), e.id);
  }
  audit('EMPLOYEE_UPDATE', req.session.display_id, admin.role, { employee_id: e.employee_id });
  res.json({ ok: true });
});

r.delete('/:id', (req, res) => {
  const admin = db.prepare('SELECT * FROM admins WHERE id=?').get(req.session.ref_id);
  const e = db.prepare('SELECT * FROM employees WHERE id=?').get(req.params.id);
  if (!e) return res.status(404).json({ error: 'Employee not found.' });
  try { assertSectionAccess(req, e.section_id); } catch (err) {
    return res.status(403).json({ error: 'You can only manage employees in your own section.' });
  }
  db.prepare('UPDATE employees SET active=0 WHERE id=?').run(e.id);
  audit('EMPLOYEE_DEACTIVATE', req.session.display_id, admin.role, { employee_id: e.employee_id });
  res.json({ ok: true, note: 'Employee deactivated; attendance history retained.' });
});

module.exports = { router: r };
