'use strict';
// Shared admin scoping helpers: SECTION_ADMIN sees only their own section.
const { db } = require('./db');
const { requireSession, requireUnlocked, requireAdmin } = require('./routes-auth');

function adminOf(req) {
  return db.prepare('SELECT * FROM admins WHERE id=?').get(req.session.ref_id);
}

function scopedSectionIds(req) {
  const admin = adminOf(req);
  if (admin.role === 'SUPER_ADMIN') {
    return db.prepare('SELECT id FROM sections').all().map(x => x.id);
  }
  return admin.section_id ? [admin.section_id] : [];
}

function assertSectionAccess(req, sectionId) {
  const ids = scopedSectionIds(req);
  if (!ids.includes(Number(sectionId))) {
    const e = new Error('FORBIDDEN_SECTION');
    e.status = 403;
    throw e;
  }
}

function assertSuper(req, res) {
  const admin = adminOf(req);
  if (admin.role !== 'SUPER_ADMIN') {
    res.status(403).json({ error: 'Only Super Admin can perform this action.' });
    return false;
  }
  return true;
}

function employeeRow(e) {
  const sec = db.prepare('SELECT name FROM sections WHERE id=?').get(e.section_id);
  const sh = db.prepare('SELECT name, start_time, end_time FROM shifts WHERE id=?').get(e.shift_id);
  const maxAtt = parseInt((db.prepare('SELECT value FROM settings WHERE key=?').get('max_login_attempts') || {}).value || '3', 10);
  const fails = db.prepare(
    `SELECT COUNT(*) AS n FROM login_attempts WHERE identity=? AND success=0
     AND id > COALESCE((SELECT MAX(id) FROM login_attempts WHERE identity=? AND success=1), 0)`
  ).get(e.employee_id, e.employee_id).n;
  return {
    id: e.id, employee_id: e.employee_id, name: e.name,
    section_id: e.section_id, section_name: sec ? sec.name : '',
    shift_id: e.shift_id, shift_name: sh ? `${sh.name} (${sh.start_time}-${sh.end_time})` : '',
    active: !!e.active, consent_given: !!e.consent_given, locked: fails >= maxAtt,
  };
}

const guard = [requireSession, requireUnlocked, requireAdmin];

module.exports = { adminOf, scopedSectionIds, assertSectionAccess, assertSuper, employeeRow, guard };
