/* ============================================================
   AttendX Aero-Ops Telemetry — Frontend Application
   ============================================================ */
'use strict';

const App = (() => {
  let token = localStorage.getItem('ax_token');
  let user = JSON.parse(localStorage.getItem('ax_user') || 'null');
  let events = [];
  let currentFilter = 'all';

  // ────────── INIT ──────────
  function init() {
    if (token && user) return showApp();
    bind('#form-login', 'submit', onLogin);
    startClock();
  }

  // ────────── AUTH ──────────
  async function onLogin(e) {
    e.preventDefault();
    const id = val('#inp-id');
    const pw = val('#inp-pw');
    const r = await api('/api/auth/login', { username: id, password: pw });
    if (r.error) {
      const el = $('#login-error');
      el.classList.add('show');
      el.textContent = r.locked ? r.error : `${r.error}${r.remainingAttempts != null ? ` (${r.remainingAttempts} left)` : ''}`;
      return;
    }
    token = r.token;
    user = r.user;
    localStorage.setItem('ax_token', token);
    localStorage.setItem('ax_user', JSON.stringify(user));
    showApp();
  }

  function logout() {
    token = null;
    user = null;
    localStorage.removeItem('ax_token');
    localStorage.removeItem('ax_user');
    $('#screen-login').classList.add('active');
    $('#screen-app').classList.remove('active');
  }

  function showApp() {
    $('#screen-login').classList.remove('active');
    $('#screen-app').classList.add('active');
    const roleLabel = user.role === 'super_admin' ? 'SUPER ADMIN' : user.role === 'section_admin' ? 'SECTION ADMIN' : 'EMPLOYEE';
    $('#tb-role').textContent = roleLabel;

    // Sidebar click handlers
    $$('.sb-item[data-view]').forEach(btn => {
      btn.addEventListener('click', () => navigate(btn.dataset.view));
    });

    navigate('dashboard');
  }

  // ────────── NAVIGATION ──────────
  function navigate(view) {
    $$('.sb-item').forEach(b => b.classList.toggle('active', b.dataset.view === view));
    $$('.view').forEach(v => v.classList.remove('active'));
    const el = $(`#view-${view}`);
    if (el) el.classList.add('active');

    // Highlight matching top tab
    $$('.tb-tab').forEach(t => t.classList.remove('active'));
    const tabMap = { dashboard: 0, geofence: 1, shifts: 2, audit: 3 };
    if (tabMap[view] != null) $$('.tb-tab')[tabMap[view]]?.classList.add('active');

    const loaders = {
      dashboard: loadDashboard,
      employees: loadEmployees,
      geofence: loadGeofences,
      shifts: loadShifts,
      sections: loadSections,
      audit: loadAudit,
      settings: loadSettings,
    };
    if (loaders[view]) loaders[view]();
  }

  // ────────── DASHBOARD ──────────
  async function loadDashboard() {
    const [stats, liveEvents, lockouts] = await Promise.all([
      api('/api/stats'),
      api('/api/events/live'),
      api('/api/lockouts'),
    ]);

    events = liveEvents;

    setText('#stat-total', stats.totalWorkforce ?? '--');
    setText('#stat-present', stats.onSiteVerified ?? '--');
    setText('#stat-late', stats.lateFlagged ?? '--');
    setText('#stat-breaks', stats.breakLunch ?? '--');
    setText('#stat-breaches', stats.geofenceBreach ?? '--');
    setText('#stat-lockouts', stats.authLockouts ?? '--');
    setText('#evt-id', events.length ? `EVT-${(events[0].id || '').slice(0, 8).toUpperCase()}` : '---');

    renderLiveEvent(events[0]);
    renderStream(events);
    renderLockouts(lockouts);
    drawRadar(events);
  }

  function renderLiveEvent(evt) {
    const el = $('#live-event');
    if (!evt) { el.innerHTML = '<div class="empty-state">Awaiting telemetry signal...</div>'; return; }

    const isLate = evt.status === 'LATE';
    const badgeClass = isLate ? 'badge-late' : 'badge-ok';
    const badgeText = isLate ? 'LATE' : 'ON-SITE VERIFIED';

    el.innerHTML = `
      <div class="live-grid">
        <img class="live-photo" src="/uploads/${evt.photo_path}" alt="" onerror="this.style.background='var(--bg-card)'">
        <div>
          <div class="live-name">
            ${esc(evt.full_name)}
            <span class="badge badge-id">${esc(evt.emp_code)}</span>
            <span class="badge ${badgeClass}">${badgeText}</span>
          </div>
          <div class="live-meta">
            <div class="meta-item"><span class="meta-label">SECTION / SHIFT</span><span class="meta-val">${esc(evt.section_name)} / ${esc(evt.shift_name)}</span></div>
            <div class="meta-item"><span class="meta-label">CHECKPOINT</span><span class="meta-val">${esc(evt.checkpoint_name)}</span></div>
            <div class="meta-item"><span class="meta-label">TIMESTAMP</span><span class="meta-val">${time(evt.timestamp || evt.created_at)}</span></div>
            <div class="meta-item"><span class="meta-label">STATUS</span><span class="meta-val" style="color:${isLate ? 'var(--red)' : 'var(--green)'}">${evt.status}</span></div>
          </div>
          <div class="live-meta" style="margin-top:6px">
            <div class="meta-item meta-wide"><span class="meta-label">GPS</span><span class="meta-val">${(evt.latitude || 0).toFixed(4)}° N, ${(evt.longitude || 0).toFixed(4)}° W</span></div>
            <div class="meta-item"><span class="meta-label">DEVICE</span><span class="meta-val">Chrome PWA</span></div>
          </div>
        </div>
        <div class="live-actions">
          <button class="btn-approve" onclick="App.toast('Late exception approved','success')">APPROVE LATE EXCEPTION</button>
          <button onclick="App.toast('Page comm sent','info')">PAGE COMM</button>
          <button onclick="App.toast('Logged to audit','info')">LOG AUDIT</button>
        </div>
      </div>`;
  }

  function renderStream(list) {
    const el = $('#stream-body');
    if (!list.length) { el.innerHTML = '<div class="empty-state">No events recorded</div>'; return; }

    const cpFlow = ['LOGIN', 'LUNCH OUT', 'LUNCH IN', 'TEA OUT', 'TEA IN', 'END'];

    el.innerHTML = list.slice(0, 40).map(e => {
      const isLate = e.status === 'LATE';
      const isBreach = e.status === 'REJECTED';
      const cls = isLate ? 'is-late' : isBreach ? 'is-breach' : '';
      const badgeCls = isLate ? 'badge-late' : isBreach ? 'badge-breach' : 'badge-ok';
      const badgeTxt = isLate ? 'LATE' : isBreach ? 'GEOFENCE BREACH' : 'ON-SITE VERIFIED';
      const cpIdx = cpFlow.findIndex(c => (e.checkpoint_name || '').toUpperCase().includes(c.replace(' ', '')));

      return `
        <div class="stream-item ${cls}">
          <img class="si-photo" src="/uploads/${e.photo_path}" alt="" onerror="this.style.background='var(--bg-card)'">
          <div>
            <div class="si-name">${esc(e.full_name)} <span class="si-id">${esc(e.emp_code)}</span> <span class="badge ${badgeCls}">${badgeTxt}</span></div>
            <div class="si-detail">${esc(e.section_name)} · ${esc(e.shift_name)} · ${esc(e.checkpoint_name)}</div>
            <div class="si-gps">GPS: ${(e.latitude||0).toFixed(4)}, ${(e.longitude||0).toFixed(4)} | ${time(e.timestamp || e.created_at)}</div>
          </div>
          <div class="si-flow">
            ${cpFlow.map((c, i) =>
              `<span class="cp-box ${i < cpIdx ? 'done' : i === cpIdx ? 'now' : ''}">${c}</span>${i < cpFlow.length - 1 ? '<span class="cp-arrow">→</span>' : ''}`
            ).join('')}
          </div>
        </div>`;
    }).join('');

    setText('#stream-count', `SHOWING ${list.length} OF ${list.length} PERSONNEL`);
  }

  function renderLockouts(list) {
    const el = $('#lockouts-body');
    if (!list.length) { el.innerHTML = '<div class="empty-state">No lockouts recorded</div>'; return; }
    el.innerHTML = list.map(l => {
      const locked = l.failed_attempts >= 3;
      return `
        <div class="lockout-row">
          <span class="lo-id">${esc(l.identity)}</span>
          <span class="lo-status ${locked ? 'locked' : 'warn'}">${l.failed_attempts}/3 ${locked ? 'LOCKED' : 'WARN'}</span>
          <span class="lo-ip">192.168.x.x</span>
          <span class="lo-time">${l.locked_until || 'Active'}</span>
          <div class="lo-action"><button onclick="App.unlockUser('${esc(l.identity)}')">UNLOCK</button></div>
        </div>`;
    }).join('');
  }

  // ────────── RADAR CANVAS ──────────
  function drawRadar(list) {
    const canvas = $('#radar-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    const cx = W / 2, cy = H / 2, R = Math.min(W, H) / 2 - 16;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#080e18';
    ctx.fillRect(0, 0, W, H);

    // Grid rings
    [.25, .5, .75, 1].forEach(f => {
      ctx.beginPath();
      ctx.arc(cx, cy, R * f, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(0,229,255,0.1)';
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    // Cross lines
    ctx.strokeStyle = 'rgba(0,229,255,0.06)';
    ctx.beginPath(); ctx.moveTo(cx, cy - R); ctx.lineTo(cx, cy + R); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - R, cy); ctx.lineTo(cx + R, cy); ctx.stroke();

    // Diagonals
    ctx.beginPath(); ctx.moveTo(cx - R * .7, cy - R * .7); ctx.lineTo(cx + R * .7, cy + R * .7); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + R * .7, cy - R * .7); ctx.lineTo(cx - R * .7, cy + R * .7); ctx.stroke();

    // Geofence ring
    ctx.beginPath();
    ctx.arc(cx, cy, R * .82, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(0,255,136,0.35)';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 4]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Center label
    ctx.fillStyle = 'rgba(0,229,255,0.5)';
    ctx.font = '9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('HQ-ALPHA', cx, cy + 4);

    // Employee dots
    const present = list.filter(e => e.status !== 'REJECTED');
    const breaches = list.filter(e => e.status === 'REJECTED');

    present.forEach((e, i) => {
      const angle = (i / Math.max(present.length, 1)) * Math.PI * 2 - Math.PI / 2;
      const dist = (.3 + Math.random() * .42) * R;
      const x = cx + Math.cos(angle) * dist;
      const y = cy + Math.sin(angle) * dist;
      const color = e.status === 'LATE' ? '#ffb300' : '#00ff88';

      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(x, y, 7, 0, Math.PI * 2);
      ctx.strokeStyle = color.replace(')', ',0.25)').replace('rgb', 'rgba');
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    breaches.forEach((e, i) => {
      const angle = (i / Math.max(breaches.length, 1)) * Math.PI * 2;
      const dist = R * (.86 + Math.random() * .14);
      const x = cx + Math.cos(angle) * dist;
      const y = cy + Math.sin(angle) * dist;

      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#ff3366';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(x, y, 9, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,51,102,0.3)';
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    setText('#ri-inside', `${present.length} INSIDE`);
    setText('#ri-outside', `${breaches.length} OUTSIDE`);
  }

  function filterStream(type, btn) {
    currentFilter = type;
    $$('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const filtered = type === 'all' ? events : events.filter(e => e.status === type || (type === 'REJECTED' && e.status === 'REJECTED'));
    renderStream(filtered);
  }

  // ────────── EMPLOYEES ──────────
  async function loadEmployees() {
    const list = await api('/api/employees');
    const el = $('#table-employees');
    if (!list.length) { el.innerHTML = '<div class="empty-state">No personnel found</div>'; return; }
    el.innerHTML = `
      <div class="t-row t-head" style="grid-template-columns: 50px 90px 1fr 1fr 1fr 80px">
        <span></span><span>ID</span><span>NAME</span><span>SECTION</span><span>SHIFT</span><span>STATUS</span>
      </div>
      ${list.map(e => `
        <div class="t-row" style="grid-template-columns: 50px 90px 1fr 1fr 1fr 80px">
          <img src="/uploads/${e.photo_path || ''}" style="width:36px;height:36px;border-radius:5px;object-fit:cover;border:1px solid var(--border);background:var(--bg-card)" onerror="this.style.display='none'">
          <span class="t-cyan">${esc(e.employee_id)}</span>
          <span>${esc(e.full_name)}</span>
          <span>${esc(e.section_name)}</span>
          <span>${esc(e.shift_name)}</span>
          <span class="${e.is_active ? 't-green' : 't-red'}">${e.is_active ? 'ACTIVE' : 'INACTIVE'}</span>
        </div>
      `).join('')}`;
  }

  // ────────── GEOFENCES ──────────
  async function loadGeofences() {
    const list = await api('/api/geofences');
    const el = $('#table-geofence');
    if (!list.length) { el.innerHTML = '<div class="empty-state">No geofence zones</div>'; return; }
    el.innerHTML = `
      <div class="t-row t-head" style="grid-template-columns: 1fr 1fr 1fr 80px 80px">
        <span>ZONE</span><span>LATITUDE</span><span>LONGITUDE</span><span>RADIUS</span><span>STATUS</span>
      </div>
      ${list.map(z => `
        <div class="t-row" style="grid-template-columns: 1fr 1fr 1fr 80px 80px">
          <span class="t-cyan">${esc(z.name)}</span>
          <span>${z.center_lat}</span>
          <span>${z.center_lng}</span>
          <span>${z.radius_meters}m</span>
          <span class="t-green">ACTIVE</span>
        </div>
      `).join('')}`;
  }

  // ────────── SHIFTS ──────────
  async function loadShifts() {
    const list = await api('/api/shifts');
    const el = $('#table-shifts');
    if (!list.length) { el.innerHTML = '<div class="empty-state">No shifts configured</div>'; return; }
    el.innerHTML = `
      <div class="t-row t-head" style="grid-template-columns: 1fr 90px 90px 80px 120px">
        <span>SHIFT</span><span>START</span><span>END</span><span>GRACE</span><span>ACTIONS</span>
      </div>
      ${list.map(s => `
        <div class="t-row" style="grid-template-columns: 1fr 90px 90px 80px 120px">
          <span class="t-cyan">${esc(s.name)}</span>
          <span>${s.start_time}</span>
          <span>${s.end_time}</span>
          <span>${s.grace_minutes}m</span>
          <span><button class="btn-tiny" onclick="App.viewCheckpoints('${s.id}','${esc(s.name)}')">CHECKPOINTS</button></span>
        </div>
      `).join('')}`;
  }

  async function viewCheckpoints(shiftId, shiftName) {
    const cps = await api(`/api/checkpoints/${shiftId}`);
    openModal(`${shiftName} — CHECKPOINTS`, cps.map(c => `
      <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border)">
        <span style="color:var(--cyan);font-size:10px;width:24px">#${c.sequence_order}</span>
        <span style="flex:1">${esc(c.name)}</span>
        <span style="font-size:8px;color:var(--txt3)">${c.is_custom ? 'CUSTOM' : 'DEFAULT'}</span>
      </div>
    `).join(''));
  }

  // ────────── SECTIONS ──────────
  async function loadSections() {
    const list = await api('/api/sections');
    const el = $('#table-sections');
    if (!list.length) { el.innerHTML = '<div class="empty-state">No sections</div>'; return; }
    el.innerHTML = `
      <div class="t-row t-head" style="grid-template-columns: 1fr 200px">
        <span>SECTOR NAME</span><span>ACTIONS</span>
      </div>
      ${list.map(s => `
        <div class="t-row" style="grid-template-columns: 1fr 200px">
          <span class="t-cyan">${esc(s.name)}</span>
          <span><button class="btn-tiny danger" onclick="App.deleteSection('${s.id}')">DELETE</button></span>
        </div>
      `).join('')}`;
  }

  // ────────── AUDIT ──────────
  async function loadAudit() {
    const list = await api('/api/audit');
    const el = $('#table-audit');
    if (!list.length) { el.innerHTML = '<div class="empty-state">No audit entries</div>'; return; }
    el.innerHTML = `
      <div class="t-row t-head" style="grid-template-columns: 140px 1fr 100px 1fr">
        <span>TIMESTAMP</span><span>EVENT</span><span>USER</span><span>DETAILS</span>
      </div>
      ${list.map(l => `
        <div class="t-row" style="grid-template-columns: 140px 1fr 100px 1fr">
          <span class="t-muted">${l.created_at}</span>
          <span class="t-cyan">${esc(l.event_type)}</span>
          <span>${esc(l.user_id || '--')}</span>
          <span class="t-muted">${esc(l.details || '')}</span>
        </div>
      `).join('')}`;
  }

  // ────────── SETTINGS ──────────
  async function loadSettings() {
    const s = await api('/api/settings');
    $('#settings-body').innerHTML = `
      <div class="set-row"><span class="set-label">SESSION TIMEOUT (MINUTES)</span><input class="set-input" type="number" id="set-timeout" value="${s.session_timeout_minutes || 15}"></div>
      <div class="set-row"><span class="set-label">MAX LOGIN ATTEMPTS</span><input class="set-input" type="number" id="set-attempts" value="${s.max_login_attempts || 3}"></div>
      <div class="set-row"><span class="set-label">DEFAULT GEOFENCE RADIUS (M)</span><input class="set-input" type="number" id="set-radius" value="${s.default_geofence_radius || 50}"></div>
      <div class="set-row"><span class="set-label">DATA RETENTION (DAYS)</span><input class="set-input" type="number" id="set-retention" value="${s.data_retention_days || 180}"></div>
      <button class="btn-glow" style="margin-top:16px" onclick="App.saveSettings()">SAVE CONFIGURATION</button>
    `;
  }

  async function saveSettings() {
    await api('/api/settings', {
      session_timeout_minutes: val('#set-timeout'),
      max_login_attempts: val('#set-attempts'),
      default_geofence_radius: val('#set-radius'),
      data_retention_days: val('#set-retention'),
    }, true, 'PUT');
    toast('Configuration saved', 'success');
  }

  // ────────── ACTIONS ──────────
  async function unlockUser(identity) {
    await api(`/api/lockouts/${encodeURIComponent(identity)}/unlock`, {}, true);
    toast(`${identity} unlocked`, 'success');
    loadDashboard();
  }

  async function deleteSection(id) {
    if (!confirm('Delete this section?')) return;
    await api(`/api/sections/${id}`, {}, false, 'DELETE');
    toast('Section deleted', 'success');
    loadSections();
  }

  // ────────── MODALS ──────────
  function openModal(title, html) {
    $('#modal-title').textContent = title;
    $('#modal-body').innerHTML = html;
    $('#modal-overlay').classList.add('open');
  }
  function closeModal() { $('#modal-overlay').classList.remove('open'); }

  function showModalAddSection() {
    openModal('ADD SECTOR', `
      <label>SECTOR NAME</label><input id="m-sec-name" placeholder="e.g. Propulsion">
      <button class="btn-glow" style="margin-top:16px" onclick="App.addSection()">CREATE</button>
    `);
  }
  async function addSection() {
    const r = await api('/api/sections', { name: val('#m-sec-name') });
    if (r.error) return toast(r.error, 'error');
    toast('Sector created', 'success'); closeModal(); loadSections();
  }

  function showModalAddShift() {
    openModal('ADD SHIFT', `
      <label>SHIFT NAME</label><input id="m-shift-name" placeholder="e.g. Night Watch">
      <label>START TIME</label><input id="m-shift-start" type="time">
      <label>END TIME</label><input id="m-shift-end" type="time">
      <label>GRACE PERIOD (MIN)</label><input id="m-shift-grace" type="number" value="10">
      <button class="btn-glow" style="margin-top:16px" onclick="App.addShift()">CREATE</button>
    `);
  }
  async function addShift() {
    const r = await api('/api/shifts', {
      name: val('#m-shift-name'), start_time: val('#m-shift-start'),
      end_time: val('#m-shift-end'), grace_minutes: parseInt(val('#m-shift-grace')) || 10,
    });
    if (r.error) return toast(r.error, 'error');
    toast('Shift created with checkpoints', 'success'); closeModal(); loadShifts();
  }

  function showModalAddGeofence() {
    openModal('ADD GEOFENCE ZONE', `
      <label>ZONE NAME</label><input id="m-geo-name" placeholder="e.g. HQ Alpha">
      <label>LATITUDE</label><input id="m-geo-lat" type="number" step="any" placeholder="37.7749">
      <label>LONGITUDE</label><input id="m-geo-lng" type="number" step="any" placeholder="-122.4194">
      <label>RADIUS (METERS)</label><input id="m-geo-rad" type="number" value="50" min="20">
      <button class="btn-glow" style="margin-top:16px" onclick="App.addGeofence()">CREATE ZONE</button>
    `);
  }
  async function addGeofence() {
    const r = await api('/api/geofences', {
      name: val('#m-geo-name'), center_lat: parseFloat(val('#m-geo-lat')),
      center_lng: parseFloat(val('#m-geo-lng')), radius_meters: parseInt(val('#m-geo-rad')) || 50,
    });
    if (r.error) return toast(r.error, 'error');
    toast('Zone created', 'success'); closeModal(); loadGeofences();
  }

  function showModalAddEmployee() {
    api('/api/sections').then(sections => {
      api('/api/shifts').then(shifts => {
        openModal('ADD PERSONNEL', `
          <label>EMPLOYEE ID</label><input id="m-emp-eid" placeholder="EMP-XXXXX">
          <label>FULL NAME</label><input id="m-emp-name" placeholder="John Doe">
          <label>PASSWORD</label><input id="m-emp-pw" type="password" placeholder="Leave blank for auto-generate">
          <label>SECTION</label>
          <select id="m-emp-sec">${sections.map(s => `<option value="${s.id}">${esc(s.name)}</option>`).join('')}</select>
          <label>SHIFT</label>
          <select id="m-emp-shift">${shifts.map(s => `<option value="${s.id}">${esc(s.name)}</option>`).join('')}</select>
          <button class="btn-glow" style="margin-top:16px" onclick="App.createEmployee()">CREATE</button>
        `);
      });
    });
  }

  async function createEmployee() {
    const body = new FormData();
    body.append('employee_id', val('#m-emp-eid'));
    body.append('full_name', val('#m-emp-name'));
    body.append('section_id', val('#m-emp-sec'));
    body.append('shift_id', val('#m-emp-shift'));
    if (val('#m-emp-pw')) body.append('password', val('#m-emp-pw'));
    const r = await fetch('/api/employees', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body
    }).then(r => r.json());
    if (r.error) return toast(r.error, 'error');
    toast(r.generatedPassword ? `Created. Password: ${r.generatedPassword}` : 'Personnel created', 'success');
    closeModal();
    loadEmployees();
  }

  // ────────── UTILITIES ──────────
  async function api(url, body, sendJson = true, method = null) {
    const opts = { method: method || (body ? 'POST' : 'GET'), headers: {} };
    if (token) opts.headers['Authorization'] = `Bearer ${token}`;
    if (body && sendJson) { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }
    try {
      const r = await fetch(url, opts);
      if (r.status === 401) { logout(); return { error: 'Session expired' }; }
      const text = await r.text();
      try { return JSON.parse(text); } catch { return { error: r.status >= 400 ? `Server error (${r.status})` : text }; }
    } catch (e) { return { error: 'Network error' }; }
  }

  function $(sel) { return document.querySelector(sel); }
  function $$(sel) { return document.querySelectorAll(sel); }
  function val(sel) { return ($(sel) || {}).value || ''; }
  function setText(sel, txt) { const el = $(sel); if (el) el.textContent = txt; }
  function esc(s) { const d = document.createElement('div'); d.textContent = s || ''; return d.innerHTML; }
  function time(ts) { return ts ? new Date(ts).toLocaleTimeString() : '--'; }
  function bind(sel, evt, fn) { const el = $(sel); if (el) el.addEventListener(evt, fn); }

  function toast(msg, type = 'info') {
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.textContent = msg;
    $('#toast-container').appendChild(el);
    setTimeout(() => el.remove(), 4000);
  }

  function startClock() {
    const tick = () => {
      const now = new Date();
      setText('#zulu-clock', now.toISOString().slice(11, 19) + 'Z');
    };
    tick();
    setInterval(tick, 1000);
  }

  // Expose public API
  return {
    init, navigate, logout, toast, closeModal, unlockUser, deleteSection,
    filterStream, viewCheckpoints, saveSettings, createEmployee,
    showModalAddSection, addSection, showModalAddShift, addShift,
    showModalAddGeofence, addGeofence, showModalAddEmployee,
  };
})();

document.addEventListener('DOMContentLoaded', App.init);
