'use strict';
/* AttendX end-to-end smoke test: spawns the server and exercises
   login, geofence, ordered checkpoints, late flag, lockout, unlock,
   admin dashboards, media access, settings. Run: node scripts/smoke-test.js */
const { spawn } = require('child_process');
const path = require('path');
const http = require('http');

const BASE = 'http://localhost:3210';
let passed = 0, failed = 0;

function req(method, url, body, token) {
  return new Promise((resolve) => {
    const data = body ? JSON.stringify(body) : null;
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = 'Bearer ' + token;
    if (data) headers['Content-Length'] = Buffer.byteLength(data);
    const r = http.request(BASE + url, { method, headers }, res => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(raw); } catch (e) { json = { raw }; }
        resolve({ status: res.statusCode, json });
      });
    });
    r.on('error', e => resolve({ status: 0, json: { error: e.message } }));
    if (data) r.write(data);
    r.end();
  });
}

function check(name, cond, extra) {
  if (cond) { passed++; console.log(`  ✅ ${name}`); }
  else { failed++; console.log(`  ❌ ${name} ${extra || ''}`); }
}

// Minimal valid JPEG (tiny, decodable)
const PHOTO = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDA0SEhISEhISDxAPDw0ODxUSEhIREhUWEhMTFxcXFBMXGBcYFRYVFhX/wAARCAABAAEDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD3+iiigD//2Q==';

async function main() {
  const server = spawn(process.execPath, [path.join(__dirname, '..', 'server', 'index.js')], {
    env: { ...process.env, PORT: '3210' },
  });
  process.on('exit', () => server.kill());
  process.on('uncaughtException', () => { server.kill(); process.exit(1); });
  server.stdout.on('data', () => {});
  server.stderr.on('data', d => console.error('[srv]', String(d).trim()));
  // Wait until the server is actually accepting connections (up to 10s).
  for (let i = 0; i < 20; i++) {
    const h = await req('GET', '/api/health');
    if (h.status === 200) { console.log('[srv] ready'); break; }
    await new Promise(res => setTimeout(res, 500));
    if (i === 19) { console.error('[test] server never became ready'); server.kill(); process.exit(1); }
  }

  try {
    await runTests();
  } finally {
    server.kill();
  }
  console.log(`\n=== RESULT: ${passed} passed, ${failed} failed ===`);
  process.exit(failed ? 1 : 0);
}

async function runTests() {
  console.log('--- Auth & lockout (unified rule) ---');
  const bad = await req('POST', '/api/auth/login', { identity: 'EMP003', password: 'nope' });
  check('wrong password rejected', bad.status === 401);
  await req('POST', '/api/auth/login', { identity: 'EMP003', password: 'nope' });
  const bad3 = await req('POST', '/api/auth/login', { identity: 'EMP003', password: 'nope' });
  check('3rd wrong password locks', bad3.status === 423 || (bad3.json && bad3.json.locked === true));
  const bad4 = await req('POST', '/api/auth/login', { identity: 'EMP003', password: 'Emp@123' });
  check('locked account cannot login with CORRECT password', bad4.status === 423);
  const su = await req('POST', '/api/auth/login', { identity: 'SUPER01', password: 'Super@123' });
  check('super admin login', su.status === 200 && su.json.role === 'SUPER_ADMIN');
  const un = await req('POST', '/api/admin/unlock', { identity: 'EMP003' }, su.json.token);
  check('super admin unlocks EMP003', un.status === 200);
  const after = await req('POST', '/api/auth/login', { identity: 'EMP003', password: 'Emp@123' });
  check('EMP003 can login after unlock', after.status === 200);

  console.log('--- Employee flow: geofence + ordered checkpoints + LATE ---');
  const t = after.json.token;
  const me = await req('GET', '/api/employee/me', null, t);
  check('me: name/section/shift', me.json.name === 'Amit Kumar' && me.json.shift && me.json.shift.checkpoints.length === 8);
  const signCp = me.json.shift.checkpoints.find(c => c.kind === 'SIGN_IN');
  const lunchOut = me.json.shift.checkpoints.find(c => c.kind === 'LUNCH_OUT');

  const inGeo = await req('POST', '/api/employee/geofence/check',
    { latitude: 12.9716, longitude: 77.5946, accuracy: 10 }, t);
  check('geofence INSIDE at zone center', inGeo.json.inside === true);
  const outGeo = await req('POST', '/api/employee/geofence/check',
    { latitude: 13.02, longitude: 78.1, accuracy: 10 }, t);
  check('geofence OUTSIDE far away', outGeo.json.inside === false && String(outGeo.json.message).includes('outside'));

  const noMedia = await req('POST', '/api/employee/cp/checkpoint',
    { checkpoint_id: signCp.id, latitude: 12.9716, longitude: 77.5946 }, t);
  check('checkpoint WITHOUT photo blocked', noMedia.status === 400 && /required/i.test(noMedia.json.error));

  const skip = await req('POST', '/api/employee/cp/checkpoint',
    { checkpoint_id: lunchOut.id, latitude: 12.9716, longitude: 77.5946, accuracy: 10, media_b64: PHOTO }, t);
  check('SKIP ahead (Lunch Out before Sign In) rejected', skip.status === 409);

  const today = new Date().toISOString().slice(0, 10);
  const lateSignIn = await req('POST', '/api/employee/cp/checkpoint', {
    checkpoint_id: signCp.id, latitude: 12.9716, longitude: 77.5946, accuracy: 10,
    client_time: `${today}T10:45`, media_b64: PHOTO,
  }, t);
  check('late Sign In (10:45 vs 10:30+10grace) flagged LATE', lateSignIn.json.status === 'LATE',
    JSON.stringify(lateSignIn.json));

  const cpGeoFail = await req('POST', '/api/employee/cp/checkpoint', {
    checkpoint_id: lunchOut.id, latitude: 13.02, longitude: 78.1, accuracy: 10, media_b64: PHOTO,
  }, t);
  check('checkpoint OUTSIDE geofence blocked + logged', cpGeoFail.status === 403 && /outside/i.test(cpGeoFail.json.error));

  const dup = await req('POST', '/api/employee/cp/checkpoint', {
    checkpoint_id: signCp.id, latitude: 12.9716, longitude: 77.5946, accuracy: 10, media_b64: PHOTO,
  }, t);
  check('duplicate same-day checkpoint rejected', dup.status === 409);

/* __SMOKE_PART2__ */

  console.log('--- Section admin: scoped dashboards (SA002 = Quality Control) ---');
  const sa1 = await req('POST', '/api/auth/login', { identity: 'SA002', password: 'Admin@123' });
  check('SA002 login', sa1.status === 200);
  const saT = sa1.json.token;
  const emps = await req('GET', '/api/admin/employees', null, saT);
  check('SA002 sees only Quality Control employees', emps.json.employees.every(e => e.section_name === 'Quality Control')
    && emps.json.employees.length === 2, JSON.stringify(emps.json.employees.map(e => e.employee_id)));
  const dash = await req('GET', `/api/admin/dashboard?from=${today}&to=${today}`, null, saT);
  check('folder-wise dashboard (scoped, late counts)', dash.status === 200
    && Object.keys(dash.json.tree).every(k => k === 'Quality Control'));
  const lateRecs = await req('GET', '/api/admin/records?late_only=1', null, saT);
  check('LATE records listed', lateRecs.status === 200 && lateRecs.json.records.some(r => r.status === 'LATE'));
  const uuid = lateRecs.json.records[0].media_uuid;
  const media = await req('GET', `/api/admin/media/${uuid}`, null, saT);
  check('admin media decryption endpoint', media.status === 200 && media.json && !media.json.error);
  const empMedia = await req('GET', `/api/admin/media/${uuid}`, null, t);
  check('employee CANNOT access admin media endpoint', empMedia.status === 403);

  console.log('--- Super admin: settings + geofences + export ---');
  const set1 = await req('GET', '/api/admin/settings', null, su.json.token);
  check('settings readable', set1.json.settings.session_timeout_minutes === '15');
  const set2 = await req('POST', '/api/admin/settings', { session_timeout_minutes: '20' }, su.json.token);
  check('super admin updates settings', set2.status === 200 && set2.json.settings.session_timeout_minutes === '20');
  const setNo = await req('POST', '/api/admin/settings', { session_timeout_minutes: '11' }, saT);
  check('section admin CANNOT update settings', setNo.status === 403);
  const gfBad = await req('POST', '/api/admin/geo/geofences',
    { name: 'Bad', latitude: 12.9, longitude: 77.5, radius_m: 1 }, su.json.token);
  check('1m radius rejected (min 20m)', gfBad.status === 400);
  const gf = await req('POST', '/api/admin/geo/geofences',
    { name: 'Branch Office', latitude: 12.90, longitude: 77.55, radius_m: 30 }, su.json.token);
  check('valid geofence created (30m)', gf.status === 200);
  const cpAdd = await req('POST', `/api/admin/org/shifts/${me.json.shift.id}/checkpoints`,
    { name: 'Evening Tea - Out' }, su.json.token);
  check('custom checkpoint appended (seq 9)', cpAdd.status === 200 && cpAdd.json.sequence === 9);
  const csv = await req('GET', `/api/admin/export.csv?from=${today}&to=${today}`, null, su.json.token);
  check('CSV export', csv.status === 200 && String(csv.json.raw).includes('employee_id'));
  const audit = await req('GET', '/api/admin/audit-log', null, su.json.token);
  check('audit log has GEOFENCE_REJECT + ACCOUNT_LOCKED', audit.status === 200
    && audit.json.entries.some(e => e.action === 'GEOFENCE_REJECT')
    && audit.json.entries.some(e => e.action === 'ACCOUNT_LOCKED'));

  console.log('--- Session security ---');
  const lock = await req('POST', '/api/auth/session/lock', null, t);
  check('back-button lock API', lock.status === 200);
  const blocked = await req('GET', '/api/employee/me', null, t);
  check('locked session blocked (423)', blocked.status === 423);
  const wrongResume = await req('POST', '/api/auth/session/unlock', { password: 'nope' }, t);
  check('wrong password cannot resume', wrongResume.status === 401);
  const resume = await req('POST', '/api/auth/session/unlock', { password: 'Emp@123' }, t);
  check('correct password resumes session', resume.status === 200);

  console.log('--- Employee onboarding API ---');
  const secId = emps.json.employees[0].section_id;
  const dupId = await req('POST', '/api/admin/employees', {
    employee_id: 'EMP001', name: 'X', section_id: secId,
    shift_id: me.json.shift.id, password: 'Test@123', consent: true,
  }, saT);
  check('duplicate employee ID rejected', dupId.status === 400);
  const created = await req('POST', '/api/admin/employees', {
    employee_id: 'EMP090', name: 'Test User', section_id: secId,
    shift_id: me.json.shift.id, consent: true,
  }, saT);
  check('employee created with auto password', created.status === 200 && !!created.json.generated_password);
  const newLogin = await req('POST', '/api/auth/login', {
    identity: 'EMP090', password: created.json.generated_password,
  });
  check('new employee can login', newLogin.status === 200);
  const crossCreate = await req('POST', '/api/admin/employees', {
    employee_id: 'EMP091', name: 'X2', section_id: 99999, shift_id: me.json.shift.id, consent: true,
  }, saT);
  check('section admin cannot create outside section', crossCreate.status === 403 || crossCreate.status === 400);

  console.log(`\n=== RESULT: ${passed} passed, ${failed} failed ===`);
}

main().catch(e => { console.error(e); process.exit(1); });
