'use strict';
// Full-surface probe: exercises every admin/employee endpoint the smoke test
// does not cover, catching hidden runtime errors. Run: node scripts/full-probe.js
const { spawn } = require('child_process');
const path = require('path');
const http = require('http');

const BASE = 'http://localhost:3221';
let pass = 0, fail = 0;
const ok = (n, c, x) => { console.log(`  ${c ? '✅' : '❌'} ${n}${x ? ' :: ' + x : ''}`); c ? pass++ : fail++; };
const PHOTO = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDA0SEhISEhISDxAPDw0ODxUSEhIREhUWEhMTFxcXFBMXGBcYFRYVFhX/wAARCAABAAEDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD3+iiigD//2Q==';

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

function run() {
  const srv = spawn(process.execPath, [path.join(__dirname, '..', 'server', 'index.js')],
    { env: { ...process.env, PORT: '3221' } });
  srv.stderr.on('data', d => console.error('[srv]', String(d).trim()));
  process.on('exit', () => { try { srv.kill(); } catch (e) {} });

  const wait = () => new Promise(res => {
    (async function poll() {
      for (let i = 0; i < 25; i++) {
        if ((await req('GET', '/api/health')).status === 200) { setup(srv); return res(); }
        await new Promise(r => setTimeout(r, 400));
      }
      setup(srv); res();
    })();
  });
  wait().then(main);
}

let SRV = null;
function setup(s) { SRV = s; }
function closeServer() { try { SRV.kill(); } catch (e) {} }

async function main() {
  const today = new Date().toISOString().slice(0, 10);

  console.log('--- Auth (all three demo roles) ---');
  const emp = await req('POST', '/api/auth/login', { identity: 'EMP001', password: 'Emp@123' });
  ok('employee login', emp.status === 200 && emp.json.role === 'EMPLOYEE');
  const sa = await req('POST', '/api/auth/login', { identity: 'SA001', password: 'Admin@123' });
  ok('section admin login', sa.status === 200 && sa.json.role === 'SECTION_ADMIN');
  const su = await req('POST', '/api/auth/login', { identity: 'SUPER01', password: 'Super@123' });
  ok('super admin login', su.status === 200 && su.json.role === 'SUPER_ADMIN');
  const TE = emp.json.token, TA = sa.json.token, TU = su.json.token;

  console.log('--- Employee self-service ---');
  const me = await req('GET', '/api/employee/me', null, TE);
  ok('me endpoint (8 checkpoints)', me.status === 200 && me.json.shift.checkpoints.length === 8);
  const empShifts = await req('GET', '/api/employee/shifts', null, TE);
  ok('employee shift list (for swap)', empShifts.status === 200 && empShifts.json.shifts.length >= 1);
  const hist = await req('GET', '/api/employee/cp/history', null, TE);
  ok('history endpoint', hist.status === 200 && Array.isArray(hist.json.records));
  const csv1 = await req('GET', '/api/employee/cp/export.csv', null, TE);
  ok('employee CSV export', csv1.status === 200 && String(csv1.json.raw).includes('date,checkpoint'));
  const pwBad = await req('POST', '/api/auth/account/password', { current: 'nope', next: 'Newer@123' }, TE);
  ok('password change (wrong current) rejected', pwBad.status === 401);
  const pwOk = await req('POST', '/api/auth/account/password', { current: 'Emp@123', next: 'Newer@123' }, TE);
  ok('password change OK', pwOk.status === 200);
  const relog = await req('POST', '/api/auth/login', { identity: 'EMP001', password: 'Newer@123' });
  ok('re-login after password change', relog.status === 200 && !!relog.json.token);

  console.log('--- Section admin management surface ---');
  const empList = await req('GET', '/api/admin/employees', null, TA);
  ok('SA employee list', empList.status === 200);
  const e1 = empList.json.employees[0];
  const secs = await req('GET', '/api/admin/org/sections', null, TA);
  ok('SA sees only own section', secs.json.sections.every(s => s.name === 'Production'));
  const shifts = await req('GET', '/api/admin/org/shifts', null, TA);
  const edit = await req('PUT', '/api/admin/employees/' + e1.id,
    { name: e1.name + ' Jr', shift_id: shifts.json.shifts[0].id, active: true }, TA);
  ok('SA edit (reassign)', edit.status === 200 && edit.json.ok === true);
  const deact = await req('DELETE', '/api/admin/employees/' + e1.id, null, TA);
  ok('SA deactivate', deact.status === 200);
  const zlist = await req('GET', '/api/admin/geo/geofences', null, TA);
  ok('SA geofence list', zlist.status === 200 && zlist.json.zones.length >= 1);
  const dash = await req('GET', `/api/admin/dashboard?from=${today}&to=${today}`, null, TA);
  ok('dashboard (folder tree)', dash.status === 200 && dash.json.role === 'SECTION_ADMIN');
  const late = await req('GET', '/api/admin/records?late_only=1&from=' + today + '&to=' + today, null, TA);
  ok('LATE records tab', late.status === 200 && Array.isArray(late.json.records));

console.log('--- Super admin system surface ---');
  const analytics = await req('GET', '/api/admin/analytics', null, TU);
  ok('analytics', analytics.status === 200 && Array.isArray(analytics.json.bySection));
  const swaps = await req('GET', '/api/admin/swaps', null, TU);
  ok('swap list', swaps.status === 200 && Array.isArray(swaps.json.swaps));
  const audit = await req('GET', '/api/admin/audit-log', null, TU);
  ok('audit log endpoint', audit.status === 200 && Array.isArray(audit.json.entries));
  const lockouts = await req('GET', '/api/admin/lockouts', null, TU);
  ok('lockout list', lockouts.status === 200 && Array.isArray(lockouts.json.locked));
  const photo = await req('GET', '/api/admin/photo/EMP001', null, TU);
  ok('profile photo endpoint (200 or 404)', photo.status === 200 || photo.status === 404);
  const recs = await req('GET', '/api/admin/records?date=' + today, null, TU);
  ok('flat records by date', recs.status === 200 && Array.isArray(recs.json.records));
  const exp = await req('GET', '/api/admin/export.csv?date=' + today, null, TU);
  ok('admin CSV export', exp.status === 200 && String(exp.json.raw).includes('employee_id'));

  console.log('--- Checkpoint / shift / geofence management ---');
  const shId = shifts.json.shifts[0].id;
  const cpAdd = await req('POST', `/api/admin/org/shifts/${shId}/checkpoints`, { name: 'Probe CP' }, TU);
  ok('append checkpoint', cpAdd.status === 200 && cpAdd.json.sequence > 8, JSON.stringify(cpAdd.json));
  const cpDel = await req('DELETE', `/api/admin/geo/checkpoints/${cpAdd.json.id}`, null, TU);
  ok('delete checkpoint (no history)', cpDel.status === 200);
  const shEdit = await req('PUT', `/api/admin/org/shifts/${shId}`,
    { name: shifts.json.shifts[0].name, start_time: shifts.json.shifts[0].start_time,
      end_time: shifts.json.shifts[0].end_time, late_grace_minutes: 12 }, TU);
  ok('shift edit (grace 12)', shEdit.status === 200);
  const zfAdd = await req('POST', '/api/admin/geo/geofences',
    { name: 'Probe Zone', latitude: 28.61, longitude: 77.20, radius_m: 40 }, TU);
  ok('add geofence', zfAdd.status === 200);
  const zfEdit = await req('PUT', `/api/admin/geo/geofences/${zfAdd.json.id}`,
    { name: 'Probe Zone 2', radius_m: 60, active: true }, TU);
  ok('edit geofence', zfEdit.status === 200);

  console.log('--- Security/session ---');
  await req('POST', '/api/auth/login', { identity: 'EMP004', password: 'x' });
  await req('POST', '/api/auth/login', { identity: 'EMP004', password: 'x' });
  const locked = await req('POST', '/api/auth/login', { identity: 'EMP004', password: 'x' });
  ok('EMP004 locked after 3', locked.status === 423);
  const un = await req('POST', '/api/admin/unlock', { identity: 'EMP004' }, TU);
  ok('super unlock', un.status === 200);
  const relog2 = await req('POST', '/api/auth/login', { identity: 'EMP004', password: 'Emp@123' });
  ok('EMP004 login after unlock', relog2.status === 200);
  const badTok = await req('GET', '/api/employee/me', null, 'bogus-token');
  ok('invalid token -> 401', badTok.status === 401);

  // Full 8-checkpoint sequence for EMP002 (Production) to exercise media writes.
  const emp2 = await req('POST', '/api/auth/login', { identity: 'EMP002', password: 'Emp@123' });
  const me2 = await req('GET', '/api/employee/me', null, emp2.json.token);
  ok('EMP2 unlocked session ready', me2.status === 200);
  for (const cp of me2.json.shift.checkpoints) {
    const r = await req('POST', '/api/employee/cp/checkpoint', {
      checkpoint_id: cp.id, latitude: 12.9716, longitude: 77.5946, accuracy: 12,
      client_time: `${today}T10:30`, media_b64: PHOTO,
    }, emp2.json.token);
    if (r.status !== 200) { ok(`emp2 cp ${cp.sequence}`, false, r.status + ' ' + JSON.stringify(r.json)); closeServer(); process.exit(1); }
  }
  ok('full 8-checkpoint sequence logged', true);
  const supDash = await req('GET', `/api/admin/dashboard?from=${today}&to=${today}`, null, TU);
  ok('super dashboard includes sections', supDash.status === 200 && Object.keys(supDash.json.tree).length >= 1);

  console.log(`\n=== FULL-SURFACE PROBE: ${pass} passed, ${fail} failed ===`);
  closeServer();
  process.exit(fail ? 1 : 0);
}

run();