'use strict';
// Audit log, account lockouts/unlock, system settings, shift-swap approvals.
const express = require('express');
const { db, setSetting, getAllSettings, audit } = require('./db');
const { guard } = require('./scope');

const r = express.Router();
r.use(...guard);

// Immutable audit log (permanent record of every event).
r.get('/audit-log', (req, res) => {
  res.json({ entries: db.prepare('SELECT * FROM audit_log ORDER BY id DESC LIMIT 300').all() });
});

// Locked accounts (uniform lockout rule across all roles).
r.get('/lockouts', (req, res) => {
  const maxAtt = parseInt((db.prepare('SELECT value FROM settings WHERE key=?').get('max_login_attempts') || {}).value || '3', 10);
  const admin = db.prepare('SELECT * FROM admins WHERE id=?').get(req.session.ref_id);
  const out = [];
  const check = (identity, name, role, section_id, active) => {
    if (admin.role !== 'SUPER_ADMIN' && section_id !== admin.section_id) return;
    const fails = db.prepare(
      `SELECT COUNT(*) AS n FROM login_attempts WHERE identity=? AND success=0
       AND id > COALESCE((SELECT MAX(id) FROM login_attempts WHERE identity=? AND success=1), 0)`
    ).get(identity, identity).n;
    if (fails >= maxAtt) out.push({ identity, name, role, active: !!active });
  };
  for (const e of db.prepare('SELECT employee_id, name, section_id, active FROM employees').all()) {
    check(e.employee_id, e.name, 'EMPLOYEE', e.section_id, e.active);
  }
  for (const a of db.prepare('SELECT admin_id, name, role, section_id, active FROM admins').all()) {
    check(a.admin_id, a.name, a.role, a.section_id, a.active);
  }
  res.json({ locked: out });
});

// Unlock: Section Admin unlocks own section; Super Admin unlocks anyone.
r.post('/unlock', (req, res) => {
  const admin = db.prepare('SELECT * FROM admins WHERE id=?').get(req.session.ref_id);
  const { identity } = req.body || {};
  const emp = db.prepare('SELECT * FROM employees WHERE employee_id=?').get(identity);
  const adm = db.prepare('SELECT * FROM admins WHERE admin_id=?').get(identity);
  const target = emp || adm;
  if (!target) return res.status(404).json({ error: 'Account not found.' });
  if (admin.role !== 'SUPER_ADMIN' && target.section_id !== admin.section_id) {
    return res.status(403).json({ error: 'You can only unlock accounts in your own section.' });
  }
  db.prepare("INSERT INTO login_attempts (identity, role, success, reason) VALUES (?,?,1,'UNLOCK')")
    .run(identity, emp ? 'EMPLOYEE' : target.role);
  audit('UNLOCK', admin.admin_id, admin.role, { unlocked: identity });
  res.json({ ok: true });
});

// System settings (Super Admin only).
r.get('/settings', (req, res) => res.json({ settings: getAllSettings() }));

r.post('/settings', (req, res) => {
  const admin = db.prepare('SELECT * FROM admins WHERE id=?').get(req.session.ref_id);
  if (admin.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Only Super Admin can change system settings.' });
  }
  for (const [k, v] of Object.entries(req.body || {})) {
    if (Object.prototype.hasOwnProperty.call(getAllSettings(), k)) {
      setSetting(k, v);
      audit('SETTING_CHANGE', admin.admin_id, admin.role, { key: k, value: String(v) });
    }
  }
  res.json({ ok: true, settings: getAllSettings() });
});

// Shift-swap request/approval workflow.
r.get('/swaps', (req, res) => {
  const admin = db.prepare('SELECT * FROM admins WHERE id=?').get(req.session.ref_id);
  const base = `SELECT ss.*, e.employee_id AS emp_code, e.name AS emp_name,
      f.name AS from_shift, t.name AS to_shift
      FROM shift_swaps ss JOIN employees e ON e.id=ss.employee_id
      JOIN shifts f ON f.id=ss.from_shift_id JOIN shifts t ON t.id=ss.to_shift_id
      WHERE ss.status='PENDING'`;
  const rows = admin.role === 'SUPER_ADMIN'
    ? db.prepare(base + ' ORDER BY ss.id DESC').all()
    : db.prepare(base + ' AND e.section_id=? ORDER BY ss.id DESC').all(admin.section_id);
  res.json({ swaps: rows });
});

r.post('/swaps/:id', (req, res) => {
  const admin = db.prepare('SELECT * FROM admins WHERE id=?').get(req.session.ref_id);
  const sw = db.prepare('SELECT * FROM shift_swaps WHERE id=?').get(req.params.id);
  if (!sw) return res.status(404).json({ error: 'Swap request not found.' });
  const e = db.prepare('SELECT * FROM employees WHERE id=?').get(sw.employee_id);
  if (admin.role !== 'SUPER_ADMIN' && e.section_id !== admin.section_id) {
    return res.status(403).json({ error: 'Not your section.' });
  }
  const approve = !!(req.body && req.body.approve);
  db.prepare('UPDATE shift_swaps SET status=?, decided_by=? WHERE id=?')
    .run(approve ? 'APPROVED' : 'REJECTED', admin.id, sw.id);
  if (approve) db.prepare('UPDATE employees SET shift_id=? WHERE id=?').run(sw.to_shift_id, sw.employee_id);
  audit('SWAP_DECISION', admin.admin_id, admin.role, { swap: sw.id, approve });
  res.json({ ok: true });
});

module.exports = { router: r };
