'use strict';
// Session management: token sessions, idle timeout, back-button re-lock,
// and unified 3-attempt lockout (applies to every role).
const { db, getSetting, audit } = require('./db');
const { verifyPassword, newToken } = require('./crypto');

const IDLE_MS = () => parseInt(getSetting('session_timeout_minutes') || '15', 10) * 60 * 1000;
const MAX_ATTEMPTS = () => parseInt(getSetting('max_login_attempts') || '3', 10);

const now = () => Date.now();

function failCount(identity) {
  return db.prepare(
    `SELECT COUNT(*) AS n FROM login_attempts WHERE identity=? AND success=0
     AND id > COALESCE((SELECT MAX(id) FROM login_attempts WHERE identity=? AND success=1), 0)`
  ).get(identity, identity).n;
}

function lockRemaining(identity) {
  return Math.max(0, MAX_ATTEMPTS() - failCount(identity));
}

function createSession(u) {
  const token = newToken();
  db.prepare(
    'INSERT INTO sessions (token, user_type, ref_id, display_id, role, name, section_id, created_at, last_seen) VALUES (?,?,?,?,?,?,?,?,?)'
  ).run(token, u.type, u.refId, u.displayId, u.role, u.name, u.sectionId ?? null, now(), now());
  return token;
}

function getSession(token) {
  if (!token) return null;
  const s = db.prepare('SELECT * FROM sessions WHERE token=?').get(token);
  if (!s) return null;
  if (now() - s.last_seen > IDLE_MS()) {
    db.prepare('DELETE FROM sessions WHERE token=?').run(token);
    audit('SESSION_EXPIRE', s.display_id, s.role, 'Idle timeout');
    return null;
  }
  return s;
}

function touchSession(token) {
  db.prepare('UPDATE sessions SET last_seen=? WHERE token=?').run(now(), token);
}

function lockSession(token) {
  db.prepare('UPDATE sessions SET locked=1 WHERE token=?').run(token);
}

function isLocked(token) {
  const s = db.prepare('SELECT locked FROM sessions WHERE token=?').get(token);
  return !!(s && s.locked);
}

function unlockSession(token) {
  db.prepare('UPDATE sessions SET locked=0, last_seen=? WHERE token=?').run(now(), token);
}

function destroySession(token) {
  db.prepare('DELETE FROM sessions WHERE token=?').run(token);
}

function recordAttempt(identity, role, success, reason, ip) {
  db.prepare('INSERT INTO login_attempts (identity, role, success, reason, ip) VALUES (?,?,?,?,?)')
    .run(identity, role, success ? 1 : 0, reason || null, ip || null);
}

// Data-driven lookup: identity is resolved against employees AND admins by
// exact match so any valid account ID works regardless of its prefix
// (previously an employee ID like "SALES01" was misread as a section admin
// and could never log in even with the correct password).
function findIdentity(code) {
  const emp = db.prepare('SELECT * FROM employees WHERE employee_id=?').get(code);
  if (emp) {
    return {
      user: emp, type: 'EMPLOYEE', role: 'EMPLOYEE',
      displayId: emp.employee_id, sectionId: emp.section_id, active: !!emp.active,
    };
  }
  const adm = db.prepare('SELECT * FROM admins WHERE admin_id=?').get(code);
  if (adm) {
    return {
      user: adm, type: 'ADMIN', role: adm.role, displayId: adm.admin_id,
      sectionId: adm.section_id, active: !!adm.active,
    };
  }
  return null;
}

// Unified lockout rule: EMPLOYEE / SECTION_ADMIN / SUPER_ADMIN all share it.
function verifyLogin(identity, password, ip) {
  const code = String(identity || '').trim();
  const known = code ? findIdentity(code) : null;
  const role = known ? known.role : 'EMPLOYEE';
  if (failCount(code) >= MAX_ATTEMPTS()) {
    recordAttempt(code, role, 0, 'LOCKED', ip);
    audit('ACCOUNT_LOCKED', code, role, 'Login blocked: account locked after failed attempts');
    return { ok: false, locked: true, remaining: 0 };
  }
  if (!known) {
    recordAttempt(code, role, 0, 'NO_USER', ip);
    return { ok: false, remaining: lockRemaining(code) };
  }
  if (!known.active) {
    recordAttempt(code, role, 0, 'DEACTIVATED', ip);
    return {
      ok: false,
      error: known.type === 'ADMIN'
        ? 'Account is deactivated. Contact Super Admin.'
        : 'Account is deactivated. Contact your admin.',
    };
  }
  if (!verifyPassword(password, known.user.password_hash)) {
    recordAttempt(code, role, 0, 'WRONG_PASSWORD', ip);
    const remaining = lockRemaining(code);
    if (remaining === 0) audit('ACCOUNT_LOCKED', code, role, 'Account locked (3 wrong passwords)');
    return { ok: false, remaining, locked: remaining === 0 };
  }
  recordAttempt(code, role, 1, 'OK', ip);
  return {
    ok: true,
    type: known.type,
    refId: known.user.id,
    displayId: known.displayId,
    role,
    name: known.user.name,
    sectionId: known.sectionId,
  };
}

// Admin unlock = inserts a success marker, resetting the failure counter.
function unlockIdentity(identity, actor, actorRole) {
  const emp = db.prepare('SELECT employee_id FROM employees WHERE employee_id=?').get(identity);
  const adm = db.prepare('SELECT admin_id FROM admins WHERE admin_id=?').get(identity);
  if (!emp && !adm) return false;
  const role = emp ? 'EMPLOYEE' : adm.role;
  db.prepare("INSERT INTO login_attempts (identity, role, success, reason) VALUES (?,?,1,'UNLOCK')")
    .run(identity, role);
  audit('UNLOCK', actor, actorRole, `Unlocked ${identity}`);
  return true;
}

function lockStateOf(identity) {
  return { locked: failCount(identity) >= MAX_ATTEMPTS(), remaining: lockRemaining(identity) };
}

module.exports = {
  createSession, getSession, touchSession, lockSession, isLocked, unlockSession,
  destroySession, verifyLogin, recordAttempt, unlockIdentity, lockStateOf,
  MAX_ATTEMPTS, IDLE_MS,
};
