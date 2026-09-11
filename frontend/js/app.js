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
  let activeCp = null;
  let activeStream = null;
  let capturedPhotoBlob = null;
  let employeeData = null;
  let userCoords = { lat: 37.7749, lng: -122.4194 };

  // ────────── INIT ──────────
  function init() {
    initGeoWatch();
    setupSecurityInterceptors();
    setupPwaInstall();
    startClock();
    bind('#form-login', 'submit', onLogin);
    if (token && user) return showApp();
  }

  function quickLogin(id, pw) {
    const idEl = $('#inp-id');
    const pwEl = $('#inp-pw');
    if (idEl) idEl.value = id;
    if (pwEl) pwEl.value = pw;
    onLogin(new Event('submit', { cancelable: true }));
  }

  // ────────── AUTH ──────────
  async function onLogin(e) {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    const id = val('#inp-id');
    const pw = val('#inp-pw');
    const errEl = $('#login-error');
    if (errEl) { errEl.classList.remove('show'); errEl.textContent = ''; }

    const r = await api('/api/auth/login', { username: id, password: pw });
    if (r.error) {
      if (errEl) {
        errEl.classList.add('show');
        errEl.textContent = r.locked ? r.error : `${r.error}${r.remainingAttempts != null ? ` (${r.remainingAttempts} attempts remaining)` : ''}`;
      }
      return;
    }
    token = r.token;
    user = r.user;
    localStorage.setItem('ax_token', token);
    localStorage.setItem('ax_user', JSON.stringify(user));
    window.history.pushState({ app: 'attendx' }, '');
    showApp();
  }

  function logout() {
    token = null;
    user = null;
    localStorage.removeItem('ax_token');
    localStorage.removeItem('ax_user');
    closeCamModal();
    $('#screen-login').classList.add('active');
    $('#screen-app').classList.remove('active');
    const errEl = $('#login-error');
    if (errEl) { errEl.classList.remove('show'); errEl.textContent = ''; }
  }

  function showApp() {
    $('#screen-login').classList.remove('active');
    $('#screen-app').classList.add('active');
    const isEmp = user.role === 'employee';
    const roleLabel = user.role === 'super_admin' ? 'SUPER ADMIN' : user.role === 'section_admin' ? 'SECTION ADMIN' : 'EMPLOYEE';
    setText('#tb-role', roleLabel);

    // Dynamic role navigation setup
    const allViews = ['dashboard', 'folders', 'employees', 'geofence', 'shifts', 'sections', 'audit', 'settings'];
    if (isEmp) {
      const empNav = $('#sb-nav-employee');
      if (empNav) empNav.style.display = 'flex';
      const empTab = $('#tb-tab-employee');
      if (empTab) empTab.style.display = 'inline-block';

      allViews.forEach(k => {
        const el = $(`#sb-nav-${k}`); if (el) el.style.display = 'none';
        const tb = $(`#tb-tab-${k}`); if (tb) tb.style.display = 'none';
      });
    } else {
      const empNav = $('#sb-nav-employee');
      if (empNav) empNav.style.display = 'none';
      const empTab = $('#tb-tab-employee');
      if (empTab) empTab.style.display = 'none';

      allViews.forEach(k => {
        const el = $(`#sb-nav-${k}`); if (el) el.style.display = 'flex';
        const tb = $(`#tb-tab-${k}`); if (tb) tb.style.display = 'inline-block';
      });
    }

    // Sidebar click handlers
    $$('.sb-item[data-view]').forEach(btn => {
      btn.onclick = () => navigate(btn.dataset.view);
    });

    navigate(isEmp ? 'employee' : 'dashboard');
  }

  // ────────── NAVIGATION ──────────
  function navigate(view) {
    $$('.sb-item').forEach(b => b.classList.toggle('active', b.dataset.view === view));
    $$('.view').forEach(v => v.classList.remove('active'));
    const el = $(`#view-${view}`);
    if (el) el.classList.add('active');

    // Highlight matching top tab
    $$('.tb-tab').forEach(t => t.classList.remove('active'));
    const tabEl = $(`#tb-tab-${view}`);
    if (tabEl) tabEl.classList.add('active');

    const loaders = {
      dashboard: loadDashboard,
      folders: loadFolders,
      employee: loadEmployeePortal,
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

    events = Array.isArray(liveEvents) ? liveEvents : [];
    const statData = (stats && !stats.error) ? stats : {};
    const lockList = Array.isArray(lockouts) ? lockouts : [];

    setText('#stat-total', statData.totalWorkforce ?? '--');
    setText('#stat-present', statData.onSiteVerified ?? '--');
    setText('#stat-late', statData.lateFlagged ?? '--');
    setText('#stat-breaks', statData.breakLunch ?? '--');
    setText('#stat-breaches', statData.geofenceBreach ?? '--');
    setText('#stat-lockouts', statData.authLockouts ?? '--');
    setText('#evt-id', events.length ? `EVT-${(events[0].id || '').slice(0, 8).toUpperCase()}` : '---');

    renderLiveEvent(events[0]);
    renderStream(events);
    renderLockouts(lockList);
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
      <div class="t-row t-head" style="grid-template-columns: 50px 90px 1.2fr 1fr 1fr 80px 140px">
        <span></span><span>ID</span><span>NAME</span><span>SECTION</span><span>SHIFT</span><span>STATUS</span><span>ACTIONS</span>
      </div>
      ${list.map(e => `
        <div class="t-row" style="grid-template-columns: 50px 90px 1.2fr 1fr 1fr 80px 140px">
          <img src="/uploads/${e.photo_path || ''}" style="width:36px;height:36px;border-radius:5px;object-fit:cover;border:1px solid var(--border);background:var(--bg-card)" onerror="this.style.display='none'">
          <span class="t-cyan">${esc(e.employee_id)}</span>
          <span>${esc(e.full_name)}</span>
          <span>${esc(e.section_name)}</span>
          <span>${esc(e.shift_name)}</span>
          <span class="${e.is_active ? 't-green' : 't-red'}">${e.is_active ? 'ACTIVE' : 'INACTIVE'}</span>
          <span style="display:flex;gap:6px">
            <button class="btn-tiny" onclick="App.editEmployee('${e.id}')">EDIT</button>
            <button class="btn-tiny ${e.is_active ? 'danger' : ''}" onclick="App.toggleEmployeeStatus('${e.id}', ${e.is_active})">${e.is_active ? 'DEACTIVATE' : 'ACTIVATE'}</button>
          </span>
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
        const isSecAdmin = user.role === 'section_admin';
        const filteredSecs = isSecAdmin ? sections.filter(s => s.id === user.sectionId) : sections;
        openModal('ONBOARD NEW PERSONNEL', `
          <label>EMPLOYEE ID</label><input id="m-emp-eid" placeholder="EMP-XXXXX" required>
          <label>FULL NAME</label><input id="m-emp-name" placeholder="John Doe" required>
          <label>ACCESS KEY (PASSWORD)</label><input id="m-emp-pw" type="password" placeholder="Leave blank for auto-generate">
          <label>ASSIGN SECTOR</label>
          <select id="m-emp-sec">${filteredSecs.map(s => `<option value="${s.id}">${esc(s.name)}</option>`).join('')}</select>
          <label>ASSIGN SHIFT</label>
          <select id="m-emp-shift">${shifts.map(s => `<option value="${s.id}">${esc(s.name)} (${s.start_time} - ${s.end_time})</option>`).join('')}</select>
          <label>PROFILE PHOTO (OPTIONAL)</label>
          <input type="file" id="m-emp-photo" accept="image/*">
          <button class="btn-glow" style="margin-top:16px" onclick="App.createEmployee()">ONBOARD PERSONNEL</button>
        `);
      });
    });
  }

  async function createEmployee() {
    const eid = val('#m-emp-eid');
    const name = val('#m-emp-name');
    const sec = val('#m-emp-sec');
    const shift = val('#m-emp-shift');
    if (!eid || !name || !sec || !shift) return toast('All mandatory fields required', 'error');

    const body = new FormData();
    body.append('employee_id', eid);
    body.append('full_name', name);
    body.append('section_id', sec);
    body.append('shift_id', shift);
    if (val('#m-emp-pw')) body.append('password', val('#m-emp-pw'));
    const photoInput = $('#m-emp-photo');
    if (photoInput && photoInput.files && photoInput.files[0]) {
      body.append('photo', photoInput.files[0]);
    }

    const r = await fetch('/api/employees', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body
    }).then(r => r.json());
    if (r.error) return toast(r.error, 'error');
    toast(r.generatedPassword ? `Created. Access Key: ${r.generatedPassword}` : 'Personnel record created', 'success');
    closeModal();
    loadEmployees();
  }

  async function editEmployee(id) {
    const list = await api('/api/employees');
    const target = Array.isArray(list) ? list.find(e => e.id === id) : null;
    if (!target) return toast('Personnel not found', 'error');

    const [sections, shifts] = await Promise.all([api('/api/sections'), api('/api/shifts')]);
    const isSecAdmin = user.role === 'section_admin';

    openModal(`EDIT PERSONNEL: ${target.employee_id}`, `
      <label>FULL NAME</label><input id="m-edit-name" value="${esc(target.full_name)}">
      <label>SECTOR</label>
      <select id="m-edit-sec" ${isSecAdmin ? 'disabled' : ''}>
        ${sections.map(s => `<option value="${s.id}" ${s.id === target.section_id ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}
      </select>
      <label>ASSIGNED SHIFT</label>
      <select id="m-edit-shift">
        ${shifts.map(s => `<option value="${s.id}" ${s.id === target.shift_id ? 'selected' : ''}>${esc(s.name)} (${s.start_time} - ${s.end_time})</option>`).join('')}
      </select>
      <label>ACCOUNT STATUS</label>
      <select id="m-edit-active">
        <option value="1" ${target.is_active ? 'selected' : ''}>ACTIVE</option>
        <option value="0" ${!target.is_active ? 'selected' : ''}>DEACTIVATED</option>
      </select>
      <button class="btn-glow" style="margin-top:16px" onclick="App.saveEditEmployee('${target.id}')">SAVE PERSONNEL RECORD</button>
    `);
  }

  async function saveEditEmployee(id) {
    const r = await api(`/api/employees/${id}`, {
      full_name: val('#m-edit-name'),
      section_id: val('#m-edit-sec'),
      shift_id: val('#m-edit-shift'),
      is_active: parseInt(val('#m-edit-active'))
    }, true, 'PUT');
    if (r.error) return toast(r.error, 'error');
    toast('Personnel record updated', 'success');
    closeModal();
    loadEmployees();
  }

  async function toggleEmployeeStatus(id, currentActive) {
    const newStatus = currentActive ? 0 : 1;
    const r = await api(`/api/employees/${id}`, { is_active: newStatus }, true, 'PUT');
    if (r.error) return toast(r.error, 'error');
    toast(newStatus ? 'Personnel reactivated' : 'Personnel deactivated', 'success');
    loadEmployees();
  }

  // ────────── FOLDERS (HIERARCHICAL ATTENDANCE) ──────────
  async function loadFolders() {
    const container = $('#folders-container');
    if (!container) return;
    container.innerHTML = '<div class="empty-state">Retrieving folder hierarchy telemetry...</div>';
    const sections = await api('/api/attendance/folder');
    if (!sections || !sections.length) {
      container.innerHTML = '<div class="empty-state">No section folders found.</div>';
      return;
    }

    container.innerHTML = sections.map((sec, sIdx) => {
      const emps = sec.employees || [];
      return `
        <div class="folder-section ${sIdx === 0 ? 'open' : ''}" id="folder-sec-${sec.id}">
          <div class="folder-head" onclick="App.toggleFolder('folder-sec-${sec.id}')">
            <div class="folder-title">
              <span class="folder-chevron">▶</span>
              <span>📁 SECTOR: ${esc(sec.name)}</span>
              <span class="badge badge-taupe">${emps.length} PERSONNEL</span>
            </div>
            <span class="badge">${sec.id.slice(0, 8)}</span>
          </div>
          <div class="folder-body">
            ${!emps.length ? '<div class="empty-state" style="padding:10px">No active personnel in this sector.</div>' : emps.map(emp => {
              const dates = Object.keys(emp.attendance || {}).sort().reverse();
              const totalRecs = Object.values(emp.attendance || {}).reduce((acc, arr) => acc + arr.length, 0);
              return `
                <div class="folder-emp-card ${dates.length > 0 ? 'open' : ''}" id="folder-emp-${emp.id}">
                  <div class="folder-emp-head" onclick="App.toggleFolder('folder-emp-${emp.id}')">
                    <div style="display:flex;align-items:center;gap:10px">
                      <span class="folder-chevron emp-chevron">▶</span>
                      <span style="font-weight:600;color:var(--txt)">👤 ${esc(emp.full_name)}</span>
                      <span class="badge badge-id">${esc(emp.employee_id)}</span>
                    </div>
                    <span class="badge badge-ok">${totalRecs} CHECKPOINTS</span>
                  </div>
                  <div class="folder-emp-body">
                    ${!dates.length ? '<div class="empty-state" style="padding:8px">No attendance logs on record.</div>' : dates.map(d => {
                      const recs = emp.attendance[d] || [];
                      return `
                        <div class="folder-date-block">
                          <span class="folder-date-badge">📅 DATE: ${d} (${recs.length} LOGS)</span>
                          <div class="folder-cps-grid">
                            ${recs.map(r => {
                              const isLate = r.status === 'LATE';
                              return `
                                <div class="folder-cp-item ${isLate ? 'late' : ''}" onclick="App.viewRecordDetail('${r.id}', '${esc(emp.full_name)}', '${esc(emp.employee_id)}', '${esc(r.checkpoint_name)}', '${r.status}', '${r.created_at}', '${r.photo_path}', ${r.latitude}, ${r.longitude}, '${esc(sec.name)}')">
                                  <img class="folder-cp-thumb" src="/uploads/${r.photo_path}" alt="CP" onerror="this.src='/uploads/${emp.photo_path || ''}';this.onerror=null;">
                                  <div class="folder-cp-meta">
                                    <div class="folder-cp-name">${esc(r.checkpoint_name)}</div>
                                    <div class="folder-cp-time">⏱ ${r.created_at}</div>
                                    <div class="folder-cp-gps">📍 ${r.latitude.toFixed(4)}°, ${r.longitude.toFixed(4)}°</div>
                                    <div><span class="badge ${isLate ? 'badge-late' : 'badge-ok'}" style="padding:1px 6px;font-size:8px">${r.status}</span></div>
                                  </div>
                                </div>
                              `;
                            }).join('')}
                          </div>
                        </div>
                      `;
                    }).join('')}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }).join('');
  }

  function toggleFolder(elemId) {
    const el = $(`#${elemId}`);
    if (el) el.classList.toggle('open');
  }

  function viewRecordDetail(id, empName, empCode, cpName, status, time, photoPath, lat, lng, secName) {
    const isLate = status === 'LATE';
    openModal(`CHECKPOINT TELEMETRY: ${empCode}`, `
      <div style="display:flex;flex-direction:column;gap:14px">
        <div style="text-align:center;background:#000;border:1px solid var(--border);border-radius:6px;overflow:hidden;max-height:300px">
          <img src="/uploads/${photoPath}" alt="${cpName}" style="width:100%;height:auto;max-height:290px;object-fit:contain" onerror="this.outerHTML='<div style=\\'padding:40px;color:var(--txt3)\\'>NO PHOTO STREAM AVAILABLE</div>'">
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:11px;font-family:var(--mono)">
          <div><span style="color:var(--txt3)">PERSONNEL:</span> <b style="color:var(--txt)">${empName} (${empCode})</b></div>
          <div><span style="color:var(--txt3)">SECTOR:</span> <b style="color:var(--txt)">${secName}</b></div>
          <div><span style="color:var(--txt3)">CHECKPOINT:</span> <b style="color:var(--cyan)">${cpName}</b></div>
          <div><span style="color:var(--txt3)">STATUS:</span> <span class="badge ${isLate ? 'badge-late' : 'badge-ok'}">${status}</span></div>
          <div><span style="color:var(--txt3)">TIMESTAMP:</span> <b>${time}</b></div>
          <div><span style="color:var(--txt3)">GPS COORDINATES:</span> <b>${lat.toFixed(5)}° N, ${lng.toFixed(5)}° W</b></div>
        </div>
        ${isLate ? '<div style="background:rgba(255,170,0,0.1);border:1px solid var(--amber);padding:10px;border-radius:4px;color:var(--amber);font-size:11px">⚠️ <b>LATE-ARRIVAL DETECTED</b>: Checkpoint logged past scheduled start + grace buffer. Photo verified.</div>' : ''}
      </div>
    `);
  }

  async function exportCsv() {
    try {
      toast('Generating CSV attendance telemetry export...', 'info');
      const response = await fetch('/api/attendance/export', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) {
        return toast('Export failed: ' + response.statusText, 'error');
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `attendx_telemetry_export_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast('CSV telemetry report downloaded', 'success');
    } catch (e) {
      toast('Failed to download CSV export', 'error');
    }
  }

  // ────────── SECURITY & PWA INTERCEPTORS ──────────
  let idleTimer = null;
  let isSessionLocked = false;
  const IDLE_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes

  function setupSecurityInterceptors() {
    window.addEventListener('popstate', (e) => {
      if (token && user && !isSessionLocked) {
        e.preventDefault();
        window.history.pushState({ app: 'attendx' }, '');
        lockSession('Browser navigation intercepted');
      }
    });

    const resetIdle = () => {
      if (isSessionLocked || !token) return;
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        lockSession('Idle session expired (15m inactivity)');
      }, IDLE_TIMEOUT_MS);
    };

    ['mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll'].forEach(evt => {
      window.addEventListener(evt, resetIdle, { passive: true });
    });
    resetIdle();
  }

  function lockSession(reason) {
    if (!token || !user) return;
    isSessionLocked = true;
    const relockModal = $('#modal-relock');
    if (relockModal) {
      $('#relock-id').value = user.username || '';
      $('#relock-pw').value = '';
      const errEl = $('#relock-error');
      if (errEl) { errEl.classList.remove('show'); errEl.textContent = ''; }
      relockModal.classList.add('open');
      setTimeout(() => {
        const inp = $('#relock-pw');
        if (inp) inp.focus();
      }, 100);
      toast(reason || 'Session re-locked', 'info');
    }
  }

  async function unlockRelockedSession() {
    const pw = val('#relock-pw');
    const errEl = $('#relock-error');
    if (!pw) {
      if (errEl) { errEl.classList.add('show'); errEl.textContent = 'Password required'; }
      return;
    }

    const r = await api('/api/auth/login', { username: user.username, password: pw });
    if (r.error) {
      if (errEl) {
        errEl.classList.add('show');
        errEl.textContent = r.error;
      }
      return;
    }

    token = r.token;
    user = r.user;
    localStorage.setItem('ax_token', token);
    localStorage.setItem('ax_user', JSON.stringify(user));
    isSessionLocked = false;
    $('#modal-relock').classList.remove('open');
    toast('Session unlocked. Telemetry resumed.', 'success');
    window.history.pushState({ app: 'attendx' }, '');
  }

  let deferredInstallPrompt = null;
  function setupPwaInstall() {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredInstallPrompt = e;
      const banner = $('#pwa-install-banner');
      if (banner) banner.classList.remove('hidden');
    });
  }

  async function installPwa() {
    if (!deferredInstallPrompt) return toast('PWA installation ready via browser menu', 'info');
    deferredInstallPrompt.prompt();
    const choice = await deferredInstallPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      toast('AttendX PWA installed to device', 'success');
    }
    deferredInstallPrompt = null;
    dismissPwa();
  }

  function dismissPwa() {
    const banner = $('#pwa-install-banner');
    if (banner) banner.classList.add('hidden');
  }

  // ────────── EMPLOYEE PORTAL ──────────
  let isSimulatedOfficeGps = true;

  function initGeoWatch() {
    userCoords.lat = 37.7749;
    userCoords.lng = -122.4194;
    updateGeoTelemetry();

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        pos => {
          if (!isSimulatedOfficeGps) {
            userCoords.lat = pos.coords.latitude;
            userCoords.lng = pos.coords.longitude;
            updateGeoTelemetry();
          }
        },
        () => {},
        { enableHighAccuracy: true, timeout: 6000 }
      );
    }
  }

  function toggleGpsSimulation() {
    isSimulatedOfficeGps = !isSimulatedOfficeGps;
    const btn = $('#btn-gps-toggle');
    if (isSimulatedOfficeGps) {
      userCoords.lat = 37.7749;
      userCoords.lng = -122.4194;
      if (btn) btn.textContent = '⚡ CALIBRATED TO HQ';
      toast('GPS calibrated to HQ Alpha office zone (Inside perimeter)', 'success');
    } else {
      if (btn) btn.textContent = '🛰️ REAL DEVICE GPS';
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          pos => {
            userCoords.lat = pos.coords.latitude;
            userCoords.lng = pos.coords.longitude;
            updateGeoTelemetry();
          },
          () => toast('Unable to acquire live satellite fix', 'error'),
          { enableHighAccuracy: true, timeout: 6000 }
        );
      }
      toast('Switched to live device GPS receiver', 'info');
    }
    updateGeoTelemetry();
  }

  function showGeofenceOutsideModal(distanceMeters) {
    openModal('GEOFENCE PERIMETER LOCK', `
      <div style="text-align:center;padding:12px">
        <div style="font-size:36px;margin-bottom:12px">📡🚫</div>
        <h4 style="color:var(--amber);margin-bottom:8px">You are outside the office location.</h4>
        <p style="color:var(--txt);font-size:12px;margin-bottom:14px;line-height:1.5">Your coordinates indicate you are <b>${distanceMeters}m</b> away from the registered office perimeter. Checkpoint transmission is blocked per company security policy.</p>
        <div style="display:flex;gap:10px;justify-content:center">
          <button class="btn-glow" onclick="App.toggleGpsSimulation();App.closeModal();">⚡ CALIBRATE TO OFFICE GEOFENCE</button>
          <button class="btn-taupe" onclick="App.closeModal()">CLOSE</button>
        </div>
      </div>
    `);
  }

  function updateGeoTelemetry() {
    setText('#emp-geo-coords', `${userCoords.lat.toFixed(4)}° N, ${Math.abs(userCoords.lng).toFixed(4)}° W (±1.2m)`);
    const d = haversineMeters(userCoords.lat, userCoords.lng, 37.7749, -122.4194);
    setText('#emp-geo-distance', `${d.toFixed(1)}m from Zone Center`);
    const inside = d <= 100;
    const accessEl = $('#emp-geo-access');
    if (accessEl) {
      accessEl.className = inside ? 'meta-val green' : 'meta-val red';
      accessEl.textContent = inside ? 'INSIDE PERIMETER (VERIFIED)' : 'OUTSIDE GEOFENCE PERIMETER';
    }
    const tagEl = $('#emp-geo-status-tag');
    if (tagEl) {
      tagEl.innerHTML = `<span class="pulse"></span> ${inside ? 'PERIMETER LOCKED' : 'OUTSIDE BOUNDARY'}`;
    }
  }

  function haversineMeters(lat1, lng1, lat2, lng2) {
    const R = 6371000, dLat = (lat2 - lat1) * Math.PI / 180, dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLng/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  }

  async function loadEmployeePortal() {
    updateGeoTelemetry();
    const meRes = await api('/api/auth/me');
    if (meRes.error) return toast(meRes.error, 'error');
    employeeData = meRes.user;

    setText('#emp-name', employeeData.fullName || 'Personnel');
    setText('#emp-code', employeeData.username || '--');
    setText('#emp-section', employeeData.sectionName || 'Engineering');
    setText('#emp-shift', employeeData.shiftName || 'Morning Alpha');
    setText('#emp-shift-time', `${employeeData.shiftStartTime || '06:00'} - ${employeeData.shiftEndTime || '14:00'}`);
    setText('#emp-shift-grace', `${employeeData.shiftGraceMinutes || 10} min`);
    setText('#emp-avatar-initials', (employeeData.fullName || 'AX').slice(0, 2).toUpperCase());

    const consentBadge = $('#emp-consent-badge');
    const consentCard = $('#card-consent');
    if (employeeData.consentGiven) {
      if (consentBadge) { consentBadge.className = 'badge badge-ok'; consentBadge.textContent = 'CONSENT RECORDED'; }
      if (consentCard) consentCard.classList.add('hidden');
    } else {
      if (consentBadge) { consentBadge.className = 'badge badge-late'; consentBadge.textContent = 'CONSENT REQUIRED'; }
      if (consentCard) consentCard.classList.remove('hidden');
    }

    if (employeeData.photoPath) {
      const img = $('#emp-avatar');
      if (img) { img.src = `/uploads/${employeeData.photoPath}`; img.style.display = 'block'; }
    }

    // Load checkpoints & today's attendance
    const [cps, myRecs] = await Promise.all([
      api('/api/checkpoints/' + employeeData.shiftId),
      api('/api/attendance/my')
    ]);

    const checkpoints = Array.isArray(cps) ? cps.sort((a, b) => a.sequence_order - b.sequence_order) : [];
    const records = Array.isArray(myRecs) ? myRecs : [];

    renderEmployeeCheckpoints(checkpoints, records);
    renderEmployeeHistory(records);
  }

  async function grantConsent() {
    const r = await api('/api/employee/consent', {});
    if (r.ok) {
      toast('Biometric & GPS consent recorded', 'success');
      loadEmployeePortal();
    } else {
      toast(r.error || 'Failed to record consent', 'error');
    }
  }

  function renderEmployeeCheckpoints(cps, recs) {
    const listEl = $('#emp-cps-list');
    if (!listEl) return;
    if (!cps.length) { listEl.innerHTML = '<div class="empty-state">No checkpoints configured for this shift</div>'; return; }

    const doneOrders = recs.map(r => r.sequence_order || 0);
    const maxDone = doneOrders.length ? Math.max(...doneOrders) : 0;
    const nextSeq = maxDone + 1;

    listEl.innerHTML = cps.map(cp => {
      const isDone = doneOrders.includes(cp.sequence_order);
      const isReady = cp.sequence_order === nextSeq;
      const isLocked = cp.sequence_order > nextSeq;

      const rec = recs.find(r => (r.checkpoint_id === cp.id || r.sequence_order === cp.sequence_order));
      const statusBadge = isDone
        ? `<span class="badge ${rec?.status === 'LATE' ? 'badge-late' : 'badge-ok'}">${rec?.status || 'VERIFIED'}</span>`
        : isReady
        ? `<span class="badge" style="background:rgba(139,133,137,0.25);color:var(--taupe);border:1px solid var(--taupe)">READY TO LOG</span>`
        : `<span class="badge" style="background:rgba(255,255,255,0.05);color:var(--txt3)">LOCKED (#${cp.sequence_order})</span>`;

      const actionBtn = isReady
        ? `<button class="btn-log-cp" onclick="App.openCamModal('${cp.id}','${esc(cp.name)}',${cp.sequence_order})">📷 LOG CHECKPOINT</button>`
        : isDone && rec?.photo_path
        ? `<img class="emp-cp-thumb" src="/uploads/${rec.photo_path}" onclick="App.previewPhoto('/uploads/${rec.photo_path}')" title="View photo verification">`
        : `<span style="font-size:10px;color:var(--txt3);letter-spacing:1px">${isDone ? 'COMPLETE' : `AWAITING STEP #${nextSeq}`}</span>`;

      const cls = isDone ? 'cp-done' : isReady ? 'cp-ready' : 'cp-locked';

      return `
        <div class="emp-cp-item ${cls}">
          <div class="emp-cp-num">${isDone ? '✓' : cp.sequence_order}</div>
          <div class="emp-cp-info">
            <div class="emp-cp-title">${esc(cp.name)} ${statusBadge}</div>
            <div class="emp-cp-meta">
              ${isDone && rec ? `Logged at ${time(rec.timestamp || rec.created_at)} &bull; GPS: ${(rec.latitude||0).toFixed(4)}°, ${(rec.longitude||0).toFixed(4)}°` : `Step ${cp.sequence_order} of ${cps.length} &bull; Photo & GPS required`}
            </div>
          </div>
          <div class="emp-cp-action">${actionBtn}</div>
        </div>`;
    }).join('');
  }

  function renderEmployeeHistory(records) {
    const tableEl = $('#emp-history-table');
    setText('#emp-log-count', `${records.length} CHECKPOINT${records.length === 1 ? '' : 'S'} LOGGED TODAY`);
    if (!tableEl) return;
    if (!records.length) {
      tableEl.innerHTML = '<div class="empty-state">No checkpoints logged today yet.</div>';
      return;
    }

    tableEl.innerHTML = `
      <div class="t-row t-head" style="grid-template-columns: 50px 1fr 110px 130px 100px">
        <span>PHOTO</span><span>CHECKPOINT</span><span>TIME</span><span>GPS</span><span>STATUS</span>
      </div>
      ${records.map(r => `
        <div class="t-row" style="grid-template-columns: 50px 1fr 110px 130px 100px">
          <img src="/uploads/${r.photo_path}" style="width:34px;height:34px;border-radius:4px;object-fit:cover;border:1px solid var(--border);cursor:pointer;" onclick="App.previewPhoto('/uploads/${r.photo_path}')" onerror="this.style.display='none'">
          <span class="t-cyan font-bold">${esc(r.checkpoint_name || 'Checkpoint')}</span>
          <span>${time(r.timestamp || r.created_at)}</span>
          <span style="font-size:10px">${(r.latitude||0).toFixed(4)}°, ${(r.longitude||0).toFixed(4)}°</span>
          <span class="${r.status === 'LATE' ? 't-red' : r.status === 'REJECTED' ? 't-red' : 't-green'}">${r.status}</span>
        </div>
      `).join('')}`;
  }

  // ────────── CAMERA MODAL & CAPTURE ──────────
  function openCamModal(cpId, cpName, seq) {
    const d = haversineMeters(userCoords.lat, userCoords.lng, 37.7749, -122.4194);
    if (d > 100) {
      showGeofenceOutsideModal(Math.round(d));
      return;
    }

    activeCp = { id: cpId, name: cpName, seq };
    capturedPhotoBlob = null;

    setText('#cam-modal-title', `PHOTO & GPS VERIFICATION // ${cpName.toUpperCase()} (#${seq})`);
    setText('#cam-wm-name', `${employeeData?.username || 'EMP'} &bull; ${cpName.toUpperCase()}`);
    setText('#cam-wm-gps', `GPS: ${userCoords.lat.toFixed(4)}° N, ${Math.abs(userCoords.lng).toFixed(4)}° W`);
    setText('#cam-wm-time', `TIME: ${new Date().toISOString().slice(11, 19)}Z`);

    const modal = $('#modal-camera');
    if (modal) modal.classList.add('open');

    $('#cam-controls-capture')?.classList.remove('hidden');
    $('#cam-controls-review')?.classList.add('hidden');
    const video = $('#cam-video');
    const preview = $('#cam-preview');
    if (video) video.classList.remove('hidden');
    if (preview) preview.classList.add('hidden');

    // Start webcam
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } } })
        .then(stream => {
          activeStream = stream;
          if (video) video.srcObject = stream;
        })
        .catch(() => {
          toast('Live camera unavailable — simulated capture mode enabled', 'info');
        });
    }
  }

  function closeCamModal() {
    if (activeStream) {
      activeStream.getTracks().forEach(t => t.stop());
      activeStream = null;
    }
    const modal = $('#modal-camera');
    if (modal) modal.classList.remove('open');
    activeCp = null;
    capturedPhotoBlob = null;
  }

  function snapPhoto() {
    const video = $('#cam-video');
    const canvas = $('#cam-canvas');
    if (!video || !canvas) return;

    if (!activeStream || video.readyState < 2) {
      return simulateSnapshot();
    }

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    drawTelemetryWatermark(ctx, canvas.width, canvas.height);

    capturedPhotoBlob = canvas.toDataURL('image/jpeg', 0.85);
    displayCapturedPreview(capturedPhotoBlob);
  }

  function simulateSnapshot() {
    const canvas = $('#cam-canvas');
    if (!canvas) return;
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');

    const grad = ctx.createLinearGradient(0, 0, 640, 480);
    grad.addColorStop(0, '#0c1220');
    grad.addColorStop(1, '#1e293b');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 640, 480);

    ctx.strokeStyle = '#8B8589';
    ctx.lineWidth = 2;
    ctx.strokeRect(60, 40, 520, 400);

    ctx.fillStyle = '#334155';
    ctx.beginPath(); ctx.arc(320, 190, 70, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(320, 380, 120, Math.PI, 0); ctx.fill();

    ctx.fillStyle = '#00e5ff';
    ctx.font = 'bold 20px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('BIOMETRIC PHOTO CAPTURE [SIMULATED]', 320, 240);

    ctx.fillStyle = '#8B8589';
    ctx.font = '14px monospace';
    ctx.fillText(`${employeeData?.fullName || 'Personnel'} (${employeeData?.username || 'EMP'})`, 320, 270);
    ctx.fillText(activeCp?.name || 'Checkpoint Verification', 320, 295);

    drawTelemetryWatermark(ctx, 640, 480);

    capturedPhotoBlob = canvas.toDataURL('image/jpeg', 0.85);
    displayCapturedPreview(capturedPhotoBlob);
  }

  function drawTelemetryWatermark(ctx, w, h) {
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, h - 45, w, 45);
    ctx.fillStyle = '#00e5ff';
    ctx.font = '11px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`AX TELEMETRY | ${employeeData?.username || 'EMP'} | ${activeCp?.name || 'CHECKPOINT'}`, 14, h - 25);
    ctx.fillStyle = '#8B8589';
    ctx.fillText(`GPS: ${userCoords.lat.toFixed(5)}° N, ${Math.abs(userCoords.lng).toFixed(5)}° W | ${new Date().toISOString()}`, 14, h - 10);
  }

  function displayCapturedPreview(dataUrl) {
    const video = $('#cam-video');
    const preview = $('#cam-preview');
    if (video) video.classList.add('hidden');
    if (preview) { preview.src = dataUrl; preview.classList.remove('hidden'); }
    $('#cam-controls-capture')?.classList.add('hidden');
    $('#cam-controls-review')?.classList.remove('hidden');
  }

  function retakePhoto() {
    capturedPhotoBlob = null;
    const video = $('#cam-video');
    const preview = $('#cam-preview');
    if (preview) preview.classList.add('hidden');
    if (video) video.classList.remove('hidden');
    $('#cam-controls-capture')?.classList.remove('hidden');
    $('#cam-controls-review')?.classList.add('hidden');
  }

  async function submitCapturedCheckpoint() {
    if (!activeCp || !capturedPhotoBlob) return toast('Please capture a photo first', 'error');

    const btn = $('#btn-confirm-cp');
    if (btn) { btn.disabled = true; btn.textContent = 'TRANSMITTING...'; }

    const res = await api('/api/attendance/checkpoint', {
      checkpoint_id: activeCp.id,
      latitude: userCoords.lat,
      longitude: userCoords.lng,
      photo_base64: capturedPhotoBlob
    });

    if (btn) { btn.disabled = false; btn.textContent = '✅ CONFIRM & TRANSMIT CHECKPOINT'; }

    if (res.error) {
      if (res.error.includes('Outside geofence')) {
        closeCamModal();
        const dist = res.error.replace(/[^\d]/g, '') || 500;
        showGeofenceOutsideModal(dist);
      } else {
        toast(res.error, 'error');
      }
      return;
    }

    toast(`Checkpoint "${res.checkpoint}" logged (${res.status})`, 'success');
    closeCamModal();
    loadEmployeePortal();
  }

  function previewPhoto(url) {
    openModal('VERIFIED CHECKPOINT PHOTO CAPTURE', `
      <div style="text-align:center">
        <img src="${url}" style="max-width:100%;border-radius:6px;border:1px solid var(--border-lit);" alt="Verification Photo">
      </div>
    `);
  }

  // ────────── UTILITIES ──────────
  async function api(url, body, sendJson = true, method = null) {
    const opts = { method: method || (body ? 'POST' : 'GET'), headers: {} };
    if (token) opts.headers['Authorization'] = `Bearer ${token}`;
    if (body && sendJson) { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }
    try {
      const r = await fetch(url, opts);
      if (r.status === 401 && !url.includes('/api/auth/login')) {
        logout();
        return { error: 'Session expired' };
      }
      const text = await r.text();
      try {
        const json = JSON.parse(text);
        if (r.status >= 400 && !json.error) json.error = `Server error (${r.status})`;
        return json;
      } catch {
        return { error: r.status >= 400 ? `Server error (${r.status})` : text };
      }
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
    init, onLogin, navigate, logout, toast, closeModal, unlockUser, deleteSection,
    filterStream, viewCheckpoints, saveSettings, createEmployee,
    showModalAddSection, addSection, showModalAddShift, addShift,
    showModalAddGeofence, addGeofence, showModalAddEmployee,
    quickLogin, grantConsent, openCamModal, closeCamModal, snapPhoto,
    simulateSnapshot, retakePhoto, submitCapturedCheckpoint, previewPhoto,
    loadFolders, toggleFolder, viewRecordDetail, exportCsv,
    editEmployee, saveEditEmployee, toggleEmployeeStatus,
    unlockRelockedSession, installPwa, dismissPwa,
    toggleGpsSimulation, showGeofenceOutsideModal
  };
})();

document.addEventListener('DOMContentLoaded', App.init);
