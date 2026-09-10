'use strict';
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { db, uuid } = require('../database/schema');

const JWT_SECRET = process.env.JWT_SECRET || 'attendx-aero-ops-secret';
const SESSION_TIMEOUT = parseInt(process.env.SESSION_TIMEOUT || '15');
const MAX_ATTEMPTS = 3;

function generateToken(userType, userId) {
  return jwt.sign({ userType, userId }, JWT_SECRET, { expiresIn: `${SESSION_TIMEOUT}m` });
}

function authMiddleware(req, res, next) {
  const hdr = req.headers.authorization;
  if (!hdr || !hdr.startsWith('Bearer ')) return res.status(401).json({ error: 'No token' });
  try {
    req.user = jwt.verify(hdr.split(' ')[1], JWT_SECRET);
    next();
  } catch { return res.status(401).json({ error: 'Invalid/expired token' }); }
}

function adminOnly(req, res, next) {
  if (req.user?.userType !== 'admin') return res.status(403).json({ error: 'Admin access required' });
  next();
}

function superAdminOnly(req, res, next) {
  if (req.user?.userType !== 'admin') return res.status(403).json({ error: 'Super Admin required' });
  const a = db.prepare('SELECT role FROM admin_users WHERE id=?').get(req.user.userId);
  if (!a || a.role !== 'super_admin') return res.status(403).json({ error: 'Super Admin required' });
  next();
}

function checkLockout(identity) {
  const r = db.prepare('SELECT COUNT(*) as n FROM login_attempts WHERE identity=? AND success=0 AND id > COALESCE((SELECT MAX(id) FROM login_attempts WHERE identity=? AND success=1),0)').get(identity, identity);
  return { locked: r.n >= MAX_ATTEMPTS, remaining: Math.max(0, MAX_ATTEMPTS - r.n) };
}

function recordAttempt(identity, role, success, reason, ip) {
  db.prepare('INSERT INTO login_attempts (id,identity,role,success,reason,ip) VALUES (?,?,?,?,?,?)').run(uuid(), identity, role, success?1:0, reason||null, ip||null);
}

function resetAttempts(identity) {
  // Simply insert a success record to break the fail streak
  db.prepare("INSERT INTO login_attempts (id,identity,role,success,reason) VALUES (?,?,?,1,'RESET')").run(uuid(), identity, 'reset');
}

module.exports = { JWT_SECRET, authMiddleware, adminOnly, superAdminOnly, generateToken, checkLockout, recordAttempt, resetAttempts, SESSION_TIMEOUT, MAX_ATTEMPTS };
