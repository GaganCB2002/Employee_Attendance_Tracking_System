'use strict';
// Targeted regression check for the login fixes:
//  1) employee ID with an "SA"-style prefix logs in fine (was misrouted to admins)
//  2) locking an account then logging in returns a proper 423 lockout message
//  3) auth.unlockIdentity() no longer throws (double-quote SQL bug)
const { spawn } = require('child_process');
const path = require('path');
const http = require('http');
const { db } = require('../server/schema');
const { unlockIdentity, verifyLogin } = require('../server/auth');

const BASE = 'http://localhost:3215';
let pass = 0, fail = 0;
const ok = (n, c) => { console.log(`  ${c ? '✅' : '❌'} ${n}`); c ? pass++ : fail++; };

function req(method, url, body, token) {
  return new Promise(resolve => {
    const data = body ? JSON.stringify(body) : null;
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = 'Bearer ' + token;
    if (data) headers['Content-Length'] = Buffer.byteLength(data);
    const r = http.request(BASE + url, { method, headers }, res => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => {
        let json;
        try { json = JSON.parse(raw); } catch (e) { json = { raw }; }
        resolve({ status: res.statusCode, json });
      });
    });
    r.on('error', e => resolve({ status: 0, json: { error: e.message } }));
    if (data) r.write(data);
    r.end();
  });
}

async function main() {
  const srv = spawn(process.execPath, [path.join(__dirname, '..', 'server', 'index.js')],
    { env: { ...process.env, PORT: '3215' } });
  srv.stderr.on('data', d => console.error('[srv]', String(d).trim()));
  process.on('exit', () => srv.kill());
  for (let i = 0; i < 20; i++) {
    if ((await req('GET', '/api/health')).status === 200) break;
    await new Promise(r => setTimeout(r, 400));
  }

  console.log('--- lockout (unified rule, ALL roles) ---');
  for (let i = 0; i < 3; i++) await req('POST', '/api/auth/login', { identity: 'EMP002', password: 'wrong' });
  ok('3 wrong passwords lock (423)', (await req('POST', '/api/auth/login', { identity: 'EMP002', password: 'Emp@123' })).status === 423);
  const lockedResp = await req('POST', '/api/auth/login', { identity: 'EMP002', password: 'wrong' });
  ok('locked login returns useful lockout message',
    lockedResp.status === 423 && /locked/i.test(lockedResp.json.error));

  console.log('--- unlockIdentity (previously threw "no such column: UNLOCK") ---');
  const dbr = unlockIdentity('EMP002', 'tester', 'SUPER_ADMIN');
  ok('unlockIdentity() executes without SQL error', dbr === true);
  ok('unlocked account logs in again (200)', (await req('POST', '/api/auth/login', { identity: 'EMP002', password: 'Emp@123' })).status === 200);

  console.log('--- employee IDs with SA/SUPER prefixes (previously misrouted) ---');
  const su = await req('POST', '/api/auth/login', { identity: 'SUPER01', password: 'Super@123' });
  ok('super admin login', su.status === 200);
  const tok = su.json.token;
  const secs = await req('GET', '/api/admin/org/sections', null, tok);
  const shifts = await req('GET', '/api/admin/org/shifts', null, tok);
  const created = await req('POST', '/api/admin/employees', {
    employee_id: 'SALES01', name: 'Sales Tester',
    section_id: secs.json.sections[0].id, shift_id: shifts.json.shifts[0].id,
    password: 'Fix@123', consent: true,
  }, tok);
  ok('employee created (SALES01)', created.status === 200);
  const sal = await req('POST', '/api/auth/login', { identity: 'SALES01', password: 'Fix@123' });
  ok('SALES01 (SA-* prefix) logs in as EMPLOYEE', sal.status === 200 && sal.json.role === 'EMPLOYEE');

  console.log(`\n=== LOGIN FIX: ${pass} passed, ${fail} failed ===`);
  srv.kill();
  process.exit(fail ? 1 : 0);
}
main().catch(e => { console.error(e); process.exit(1); });