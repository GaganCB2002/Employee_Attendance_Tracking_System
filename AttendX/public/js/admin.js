/* Admin dashboard: folder-wise Section > Employee > Date > Checkpoint tree,
   late flags with one-click photos, org config, employees CRUD, settings. */
'use strict';

const Admin = {
  tab: 'dashboard',

  async render(view) {
    const isSuper = App.user.role === 'SUPER_ADMIN';
    const tabs = isSuper
      ? [['dashboard', '📁 Attendance'], ['late', '⏰ LATE Records'], ['employees', '👥 Employees'],
         ['org', '⚙️ Shifts & Checkpoints'], ['zones', '📍 Geofences'], ['analytics', '📊 Analytics'],
         ['swaps', '🔄 Swap Requests'], ['lockouts', '🔓 Locked Accounts'],
         ['settings', '🛠 System Settings'], ['audit', '📜 Audit Log']]
      : [['dashboard', '📁 Attendance'], ['late', '⏰ LATE Records'], ['employees', '👥 Employees'],
         ['swaps', '🔄 Swap Requests'], ['lockouts', '🔓 Locked Accounts'], ['audit', '📜 Audit Log']];
    if (!tabs.some(t => t[0] === this.tab)) this.tab = 'dashboard';
    view.innerHTML = `
      <div class="tabs">${tabs.map(([id, label]) =>
        `<button class="tab ${this.tab === id ? 'active' : ''}" data-tab="${id}">${label}</button>`).join('')}</div>
      <div id="tab-body" class="muted">Loading…</div>`;
    App.bindCommon(view);
    view.querySelectorAll('.tab').forEach(t => {
      t.onclick = () => { this.tab = t.dataset.tab; this.render(view); };
    });
    const body = document.getElementById('tab-body');
    try {
      await this['render_' + this.tab](body);
    } catch (e) {
      body.className = '';
      body.innerHTML = `<div class="card">⚠️ ${esc(e.message)}</div>`;
    }
  },

  viewMedia(uuid, emphasize) {
    modal(`<h3>${emphasize ? '⏰ LATE Record Capture' : 'Checkpoint Capture'}</h3>
      <img class="full" src="${mediaUrl(uuid)}" alt="capture photo">
      <p class="muted">Encrypted at rest — decrypted only for authorized admins within scope.</p>
      <div class="row" style="justify-content:flex-end">
        <a class="btn primary" href="${mediaUrl(uuid)}" target="_blank">Open full size</a>
        <button class="btn ghost" onclick="closeModal()">Close</button></div>`);
  },

/* __ADMIN_PART2__ */

  // ---- Folder-wise attendance: Section -> Employee -> Date -> Checkpoints ----
  async render_dashboard(body) {
    await this._loadTree(body);
  },

  async _loadTree(body) {
    body.className = '';
    body.innerHTML = `
      <div class="card"><div class="row">
        <label style="margin:0">From</label><input type="date" id="f-from" style="width:150px" value="${new Date().toISOString().slice(0, 10)}">
        <label style="margin:0">To</label><input type="date" id="f-to" style="width:150px" value="${new Date().toISOString().slice(0, 10)}">
        <button class="btn primary small" id="f-go">Apply</button>
      </div></div><div id="tree-body" class="muted">Loading…</div>`;
    document.getElementById('f-go').onclick = () => this._tree(document.getElementById('tree-body'));
    await this._tree(document.getElementById('tree-body'));
  },

  async _tree(container) {
    container.innerHTML = '<div class="muted">Loading…</div>';
    const from = document.getElementById('f-from').value, to = document.getElementById('f-to').value;
    const r = await API.get(`/admin/dashboard?from=${from}&to=${to}`);
    const sections = Object.entries(r.tree);
    if (!sections.length) {
      container.innerHTML = '<div class="card">No attendance records for this period yet.</div>';
      return;
    }
    container.innerHTML = sections.map(([secName, sec]) => `
      <div class="folder open">
        <div class="folder-head"><span class="arrow">▶</span> 🏢 ${esc(secName)}
          ${sec.late_count ? `<span class="late-flag">${sec.late_count} LATE</span>` : ''}
          <span class="pill neutral">${Object.keys(sec.employees).length} employees</span></div>
        <div class="folder-body">${Object.entries(sec.employees).map(([code, emp]) => `
          <div class="folder">
            <div class="folder-head"><span class="arrow">▶</span> 👤 ${esc(code)} — ${esc(emp.name)}
              ${emp.late_count ? `<span class="late-flag">${emp.late_count} LATE</span>` : ''}</div>
            <div class="folder-body">${Object.entries(emp.dates).map(([date, d]) => `
              <div class="folder">
                <div class="folder-head"><span class="arrow">▶</span> 📅 ${esc(date)}
                  ${d.late_count ? `<span class="late-flag">${d.late_count} LATE</span>` : ''}</div>
                <div class="folder-body">${d.checkpoints.map(x => `
                  <div class="rec-row ${x.status === 'LATE' ? 'late' : ''}">
                    <img class="rec-thumb" src="${mediaUrl(x.media_uuid)}" data-uuid="${x.media_uuid}"
                         alt="${esc(x.checkpoint_name)}">
                    <div>
                      <b>${esc(x.checkpoint_name)}</b>
                      <div class="muted">${esc(x.shift_name)} · ${esc(x.checkpoint_time)} ·
                        GPS ${x.latitude.toFixed(5)}, ${x.longitude.toFixed(5)}</div>
                    </div>
                    <span class="pill ${x.status === 'LATE' ? 'LATE' : 'ONTIME'}">${x.status}</span>
                    ${x.status === 'LATE'
                      ? `<button class="btn danger small" data-view-late="${x.media_uuid}">📸 Open Photo</button>` : ''}
                  </div>`).join('')}</div>
              </div>`).join('')}</div>
          </div>`).join('')}</div>
      </div>`).join('');
    container.querySelectorAll('.folder-head').forEach(h => {
      h.onclick = () => h.parentElement.classList.toggle('open');
    });
    container.querySelectorAll('.rec-thumb').forEach(img => {
      img.onclick = () => this.viewMedia(img.dataset.uuid);
    });
    container.querySelectorAll('[data-view-late]').forEach(btn => {
      btn.onclick = () => this.viewMedia(btn.dataset.viewLate, true);
    });
  },

  // ---- LATE records (flat, photo-first) ----
  async render_late(body) {
    body.className = '';
    const today = new Date().toISOString().slice(0, 10);
    body.innerHTML = `
      <div class="card"><div class="row">
        <label style="margin:0">From</label><input type="date" id="l-from" style="width:150px" value="${today}">
        <label style="margin:0">To</label><input type="date" id="l-to" style="width:150px" value="${today}">
        <button class="btn primary small" id="l-go">Apply</button>
      </div><div id="late-body" class="muted" style="margin-top:10px">Loading…</div></div>`;
    document.getElementById('l-go').onclick = () => this._late(document.getElementById('late-body'));
    await this._late(document.getElementById('late-body'));
  },

  async _late(container) {
    container.innerHTML = '<div class="muted">Loading…</div>';
    const from = document.getElementById('l-from').value, to = document.getElementById('l-to').value;
    const r = await API.get(`/admin/records?late_only=1&from=${from}&to=${to}`);
    if (!r.records.length) {
      container.innerHTML = '<div class="muted">✅ No LATE records for this period.</div>';
      return;
    }
    container.innerHTML = `
      <h3>⏰ LATE Records — ${r.records.length}</h3>
      ${r.records.map(x => `
        <div class="rec-row late">
          <img class="rec-thumb" src="${mediaUrl(x.media_uuid)}" data-uuid="${x.media_uuid}">
          <div>
            <b>${esc(x.emp_code)} — ${esc(x.emp_name)}</b>
            <div class="muted">${esc(x.section_name)} · ${esc(x.shift_name)} (start ${esc(x.start_time)},
              grace ${x.late_grace_minutes} min) · logged ${esc(x.checkpoint_time)}</div>
          </div>
          <span class="pill LATE">LATE</span>
          <button class="btn danger small" data-view-late="${x.media_uuid}">📸 Open Photo</button>
        </div>`).join('')}`;
    container.querySelectorAll('.rec-thumb').forEach(img => {
      img.onclick = () => this.viewMedia(img.dataset.uuid);
    });
    container.querySelectorAll('[data-view-late]').forEach(btn => {
      btn.onclick = () => this.viewMedia(btn.dataset.viewLate, true);
    });
  },

/* __ADMIN_PART3__ */

  // ---- Employees: onboarding, edit, deactivate, reassign ----
  async render_employees(body) {
    body.className = '';
    const [empR, secR, shR] = await Promise.all([
      API.get('/admin/employees'), API.get('/admin/org/sections'), API.get('/admin/org/shifts')]);
    this._sections = secR.sections; this._shifts = shR.shifts;
    body.innerHTML = `
      <div class="card">
        <div class="spread"><h3 style="margin:0">Employees (${empR.employees.length})</h3>
          <button class="btn primary" id="emp-add">＋ Add New Employee</button>
          ${App.user.role === 'SUPER_ADMIN' ? `<a class="btn ghost" href="/api/admin/export.csv">⬇ Export CSV</a>` : ''}</div>
      </div>
      <div class="card"><table class="data"><thead><tr>
        <th>ID</th><th>Name</th><th>Section</th><th>Shift</th><th>Status</th><th></th></tr></thead>
        <tbody>${empR.employees.map(e => `
          <tr>
            <td>${esc(e.employee_id)}</td><td>${esc(e.name)}</td><td>${esc(e.section_name)}</td>
            <td>${esc(e.shift_name)}</td>
            <td>${e.locked ? '<span class="pill LATE">🔒 LOCKED</span>' : ''}
                ${e.active ? '<span class="pill ONTIME">ACTIVE</span>' : '<span class="pill neutral">INACTIVE</span>'}
                ${e.consent_given ? '' : '<span class="pill PENDING">no consent</span>'}</td>
            <td class="row"><button class="btn small" data-edit="${e.id}">Edit</button>
                ${e.active ? `<button class="btn danger small" data-deact="${e.id}">Deactivate</button>` : ''}
                ${e.locked ? `<button class="btn small" data-unlock="${esc(e.employee_id)}">Unlock</button>` : ''}</td>
          </tr>`).join('')}</tbody></table></div>`;
    document.getElementById('emp-add').onclick = () => this._empForm();
    body.querySelectorAll('[data-edit]').forEach(b => {
      b.onclick = () => this._empForm(empR.employees.find(e => e.id === +b.dataset.edit));
    });
    body.querySelectorAll('[data-deact]').forEach(b => {
      b.onclick = () => {
        const e = empR.employees.find(x => x.id === +b.dataset.deact);
        confirmDialog(`Deactivate ${e.name} (${e.employee_id})? History is retained.`, async () => {
          try { await API.del('/admin/employees/' + e.id); toast('Employee deactivated.', 'ok'); this.render(document.getElementById('view')); }
          catch (err) { toast(err.message, 'err'); }
        });
      };
    });
    body.querySelectorAll('[data-unlock]').forEach(b => {
      b.onclick = async () => {
        try { await API.post('/admin/unlock', { identity: b.dataset.unlock }); toast('Account unlocked.', 'ok'); this.render(document.getElementById('view')); }
        catch (err) { toast(err.message, 'err'); }
      };
    });
  },

  _empForm(e) {
    const m = modal(`<h3>${e ? 'Edit Employee' : 'Add New Employee'}</h3>
      <label>Employee ID ${e ? '' : '(unique — duplicates rejected)'}</label>
      <input id="ef-id" value="${e ? esc(e.employee_id) : ''}" ${e ? 'disabled' : ''} placeholder="EMP0xx">
      <label>Full Name</label><input id="ef-name" value="${e ? esc(e.name) : ''}">
      <label>Section</label>
      <select id="ef-sec">${this._sections.map(s =>
        `<option value="${s.id}" ${e && e.section_id === s.id ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select>
      <label>Assigned Shift</label>
      <select id="ef-shift">${this._shifts.map(s =>
        `<option value="${s.id}" ${e && e.shift_id === s.id ? 'selected' : ''}>${esc(s.name)} (${esc(s.start_time)}–${esc(s.end_time)})</option>`).join('')}</select>
      ${e ? '' : `<label>Login Password — leave empty to auto-generate</label>
      <input id="ef-pw" placeholder="Auto-generate"><button class="btn ghost small" id="ef-gen" type="button">🎲 Generate</button>
      <label style="margin-top:12px"><input type="checkbox" id="ef-consent" style="width:auto;margin-right:8px" checked>
        Explicit photo & location capture consent obtained (onboarding)</label>`}
      <div class="row" style="justify-content:flex-end;margin-top:14px">
        <button class="btn ghost" onclick="closeModal()">Cancel</button>
        <button class="btn primary" id="ef-save">${e ? 'Save' : 'Create'}</button></div>
      <div id="ef-note" class="muted" style="margin-top:10px"></div>`);
    if (document.getElementById('ef-gen')) {
      document.getElementById('ef-gen').onclick = async () => {
        const r = await API.get('/auth/gen-password');
        document.getElementById('ef-pw').value = r.password;
      };
    }
    document.getElementById('ef-save').onclick = async () => {
      const payload = {
        employee_id: document.getElementById('ef-id').value.trim(),
        name: document.getElementById('ef-name').value.trim(),
        section_id: +document.getElementById('ef-sec').value,
        shift_id: +document.getElementById('ef-shift').value,
      };
      if (!e) {
        payload.password = document.getElementById('ef-pw').value || undefined;
        payload.consent = document.getElementById('ef-consent').checked;
      }
      try {
        const r = e ? await API.put('/admin/employees/' + e.id, payload)
          : await API.post('/admin/employees', payload);
        closeModal();
        if (r.generated_password) {
          modal(`<h3>Employee Created</h3>
            <p>Share these credentials with <b>${esc(payload.name)}</b>:</p>
            <p>Login ID: <b>${esc(payload.employee_id)}</b><br>Password: <b>${esc(r.generated_password)}</b></p>
            <p class="muted">The employee must change this password after first login.</p>
            <div class="row" style="justify-content:flex-end"><button class="btn primary" onclick="closeModal()">Done</button></div>`);
        } else {
          toast('Employee saved.', 'ok');
          this.render(document.getElementById('view'));
        }
      } catch (err) { toast(err.message, 'err'); }
    };
  },

/* __ADMIN_PART4__ */

  // ---- Shifts + ordered checkpoints (expandable) ----
  async render_org(body) {
    body.className = '';
    const shR = await API.get('/admin/org/shifts');
    body.innerHTML = `
      <div class="card"><div class="spread"><h3 style="margin:0">Shifts & Checkpoints</h3>
        <button class="btn primary" id="sh-add">＋ Add Shift</button></div>
        <p class="muted">Each shift carries an ordered checkpoint sequence (default 8: Sign In → Lunch Out →
          Lunch In → Tea Out → Tea In → Sign Out → 2 custom). Employees cannot skip ahead.
          Add more checkpoints — the sequence auto-extends.</p></div>
      ${shR.shifts.map(sh => `
        <div class="card">
          <div class="spread">
            <div><b>${esc(sh.name)}</b> <span class="muted">${esc(sh.start_time)}–${esc(sh.end_time)}
              · grace ${sh.late_grace_minutes} min</span></div>
            <button class="btn small" data-cp-add="${sh.id}">＋ Add Checkpoint</button>
          </div>
          <div style="margin-top:8px">${sh.checkpoints.map(c => `
            <div class="cp-item"><div class="num">${c.sequence}</div>
              <div class="meta"><div class="nm">${esc(c.name)}</div>
                <div class="sub">${esc(c.kind)}</div></div>
              <button class="btn small danger" data-cp-del="${c.id}">Remove</button></div>`).join('')}</div>
          <div class="row" style="margin-top:10px">
            <button class="btn small" data-sh-edit="${sh.id}">Edit Shift</button>
          </div>
        </div>`).join('')}`;
    document.getElementById('sh-add').onclick = () => this._shiftForm();
    body.querySelectorAll('[data-sh-edit]').forEach(b => {
      b.onclick = () => this._shiftForm(shR.shifts.find(s => s.id === +b.dataset.shEdit));
    });
    body.querySelectorAll('[data-cp-add]').forEach(b => {
      b.onclick = () => {
        const m = modal(`<h3>Add Checkpoint</h3>
          <label>Name (e.g. "Evening Tea - Out")</label><input id="cp-name">
          <div class="row" style="justify-content:flex-end;margin-top:12px">
            <button class="btn ghost" onclick="closeModal()">Cancel</button>
            <button class="btn primary" id="cp-go">Add</button></div>`);
        m.querySelector('#cp-go').onclick = async () => {
          try {
            await API.post(`/admin/org/shifts/${b.dataset.cpAdd}/checkpoints`, { name: m.querySelector('#cp-name').value });
            closeModal(); toast('Checkpoint appended to sequence.', 'ok');
            this.render(document.getElementById('view'));
          } catch (e) { toast(e.message, 'err'); }
        };
      };
    });
    body.querySelectorAll('[data-cp-del]').forEach(b => {
      b.onclick = () => confirmDialog('Remove this checkpoint?', async () => {
        try { await API.del('/admin/org/geo/checkpoints/' + b.dataset.cpDel); toast('Removed.', 'ok'); this.render(document.getElementById('view')); }
        catch (e) { toast(e.message, 'err'); }
      });
    });
  },

  _shiftForm(sh) {
    const m = modal(`<h3>${sh ? 'Edit Shift' : 'Add Shift'}</h3>
      <label>Name</label><input id="sf-name" value="${sh ? esc(sh.name) : ''}" placeholder="e.g. Day Shift B">
      <label>Start Time</label><input type="time" id="sf-start" value="${sh ? esc(sh.start_time) : '09:00'}">
      <label>End Time</label><input type="time" id="sf-end" value="${sh ? esc(sh.end_time) : '17:00'}">
      <label>Late-Arrival Grace (minutes, 10–15 typical)</label>
      <input type="number" id="sf-grace" min="0" max="120" value="${sh ? sh.late_grace_minutes : 10}">
      <div class="row" style="justify-content:flex-end;margin-top:12px">
        <button class="btn ghost" onclick="closeModal()">Cancel</button>
        <button class="btn primary" id="sf-go">Save</button></div>`);
    m.querySelector('#sf-go').onclick = async () => {
      const payload = {
        name: m.querySelector('#sf-name').value.trim(),
        start_time: m.querySelector('#sf-start').value,
        end_time: m.querySelector('#sf-end').value,
        late_grace_minutes: +m.querySelector('#sf-grace').value,
      };
      try {
        if (sh) await API.put('/admin/org/shifts/' + sh.id, payload);
        else await API.post('/admin/org/shifts', payload);
        closeModal(); toast('Shift saved (default checkpoints included for new shifts).', 'ok');
        this.render(document.getElementById('view'));
      } catch (e) { toast(e.message, 'err'); }
    };
  },

/* __ADMIN_PART5__ */

  // ---- Geofence zones (configurable radius, default 50m) ----
  async render_zones(body) {
    body.className = '';
    const zR = await API.get('/admin/geo/geofences');
    body.innerHTML = `
      <div class="card"><div class="spread"><h3 style="margin:0">Geofence Zones</h3>
        <button class="btn primary" id="z-add">＋ Add Zone</button></div>
        <p class="muted">Radius is configurable (20–5000 m). Default 50 m — phone GPS accuracy is
        typically 10–50 m, so tighter radii constantly false-fail.</p></div>
      ${zR.zones.map(z => `
        <div class="card"><div class="spread">
          <div><b>${esc(z.name)}</b><div class="muted">
            ${z.latitude.toFixed(6)}, ${z.longitude.toFixed(6)} · radius ${z.radius_m} m ·
            ${z.active ? 'active' : 'inactive'}</div></div>
          <button class="btn small" data-z-edit="${z.id}">Edit</button></div></div>`).join('')}`;
    document.getElementById('z-add').onclick = () => this._zoneForm();
    body.querySelectorAll('[data-z-edit]').forEach(b => {
      b.onclick = () => this._zoneForm(zR.zones.find(z => z.id === +b.dataset.zEdit));
    });
  },

  _zoneForm(z) {
    const m = modal(`<h3>${z ? 'Edit' : 'Add'} Geofence Zone</h3>
      <label>Zone Name</label><input id="zf-name" value="${z ? esc(z.name) : ''}" placeholder="Main Office">
      <label>Center Latitude</label><input id="zf-lat" value="${z ? z.latitude : ''}" placeholder="12.9716">
      <label>Center Longitude</label><input id="zf-lng" value="${z ? z.longitude : ''}" placeholder="77.5946">
      <label>Radius (meters, 20–5000)</label><input type="number" id="zf-rad" min="20" max="5000" value="${z ? z.radius_m : 50}">
      ${z ? `<label style="margin-top:12px"><input type="checkbox" id="zf-active" style="width:auto;margin-right:8px" ${z.active ? 'checked' : ''}>Active</label>` : ''}
      <div class="row" style="justify-content:flex-end;margin-top:12px">
        <button class="btn ghost" onclick="closeModal()">Cancel</button>
        <button class="btn primary" id="zf-go">Save</button></div>`);
    m.querySelector('#zf-go').onclick = async () => {
      const payload = {
        name: m.querySelector('#zf-name').value.trim(),
        latitude: m.querySelector('#zf-lat').value,
        longitude: m.querySelector('#zf-lng').value,
        radius_m: m.querySelector('#zf-rad').value,
      };
      if (z) payload.active = m.querySelector('#zf-active').checked;
      try {
        if (z) await API.put('/admin/geo/geofences/' + z.id, payload);
        else await API.post('/admin/geo/geofences', payload);
        closeModal(); toast('Geofence zone saved.', 'ok');
        this.render(document.getElementById('view'));
      } catch (e) { toast(e.message, 'err'); }
    };
  },

/* __ADMIN_PART6__ */

  // ---- Analytics: punctuality trends + section comparison ----
  async render_analytics(body) {
    body.className = '';
    body.innerHTML = '<div class="muted">Loading…</div>';
    const r = await API.get('/admin/analytics');
    const dayBars = r.byDay.slice(0, 14).reverse();
    body.innerHTML = `
      <div class="card"><h3>📊 Sign-In Punctuality — last 14 active days</h3>
        ${dayBars.length ? dayBars.map(d => `
          <div class="bar-row"><div class="bar-label">${esc(d.d)}</div>
            <div class="bar-track"><div class="bar-fill" style="width:${d.total ? Math.round(d.late * 100 / d.total) : 0}%"></div></div>
            <div style="width:90px">${d.late}/${d.total} late</div></div>`).join('')
        : '<div class="muted">No Sign In data yet.</div>'}</div>
      <div class="card"><h3>🏢 Section comparison (all data)</h3>
        ${r.bySection.length ? r.bySection.map(s => `
          <div class="bar-row"><div class="bar-label">${esc(s.section)}</div>
            <div class="bar-track"><div class="bar-fill all" style="width:${s.total ? Math.round((s.total - s.late) * 100 / s.total) : 0}%"></div></div>
            <div style="width:130px">${s.total - s.late}/${s.total} on-time</div></div>`).join('')
        : '<div class="muted">No data yet.</div>'}</div>`;
  },

  // ---- Swap requests ----
  async render_swaps(body) {
    body.className = '';
    const r = await API.get('/admin/swaps');
    if (!r.swaps.length) {
      body.innerHTML = '<div class="card">No pending shift-swap requests.</div>';
      return;
    }
    body.innerHTML = `<div class="card"><h3>🔄 Pending Swap Requests</h3>
      ${r.swaps.map(s => `
        <div class="rec-row"><div>
          <b>${esc(s.emp_code)} — ${esc(s.emp_name)}</b>
          <div class="muted">${esc(s.from_shift)} → ${esc(s.to_shift)} on ${esc(s.work_date)} · ${esc(s.reason || '')}</div>
        </div>
        <button class="btn ok small" data-ok="${s.id}">Approve</button>
        <button class="btn danger small" data-no="${s.id}">Reject</button></div>`).join('')}</div>`;
    body.querySelectorAll('[data-ok]').forEach(b => {
      b.onclick = async () => {
        try { await API.post('/admin/swaps/' + b.dataset.ok, { approve: true }); toast('Approved & applied.', 'ok'); this.render(document.getElementById('view')); }
        catch (e) { toast(e.message, 'err'); }
      };
    });
    body.querySelectorAll('[data-no]').forEach(b => {
      b.onclick = async () => {
        try { await API.post('/admin/swaps/' + b.dataset.no, { approve: false }); toast('Rejected.', 'ok'); this.render(document.getElementById('view')); }
        catch (e) { toast(e.message, 'err'); }
      };
    });
  },

  // ---- Locked accounts (uniform lockout rule) ----
  async render_lockouts(body) {
    body.className = '';
    const r = await API.get('/admin/lockouts');
    if (!r.locked.length) {
      body.innerHTML = '<div class="card">🔓 No locked accounts (3 wrong passwords = lock; uniform for all roles).</div>';
      return;
    }
    body.innerHTML = `<div class="card"><h3>🔒 Locked Accounts</h3>
      ${r.locked.map(x => `
        <div class="rec-row"><div>
          <b>${esc(x.identity)}</b> — ${esc(x.name)} <span class="pill neutral">${esc(x.role)}</span>
          ${x.active ? '' : '<span class="pill LATE">inactive</span>'}</div>
          <button class="btn small" data-unlock="${esc(x.identity)}">Unlock</button></div>`).join('')}</div>`;
    body.querySelectorAll('[data-unlock]').forEach(b => {
      b.onclick = async () => {
        try { await API.post('/admin/unlock', { identity: b.dataset.unlock }); toast('Unlocked.', 'ok'); this.render(document.getElementById('view')); }
        catch (e) { toast(e.message, 'err'); }
      };
    });
  },

  // ---- System settings (Super Admin) ----
  async render_settings(body) {
    body.className = '';
    const r = await API.get('/admin/settings');
    const labels = {
      session_timeout_minutes: 'Idle session timeout (minutes)',
      max_login_attempts: 'Wrong password attempts before lock',
      data_retention_days: 'Photo/GPS data retention (days)',
      require_consent: 'Require photo & GPS consent (1=yes)',
    };
    body.innerHTML = `<div class="card"><h3>🛠 System Settings</h3>
      ${App.user.role === 'SUPER_ADMIN' ? `
        ${Object.entries(labels).map(([k, label]) => `
          <label>${label}</label><input data-set="${k}" value="${esc(r.settings[k])}">`).join('')}
        <div class="row" style="margin-top:14px"><button class="btn primary" id="set-save">Save Settings</button></div>
        <p class="muted">Changes are audit-logged. Retention purge runs automatically every 6 hours.</p>`
      : '<div class="muted">Only Super Admin can change settings.</div>'}</div>`;
    if (document.getElementById('set-save')) {
      document.getElementById('set-save').onclick = async () => {
        const payload = {};
        body.querySelectorAll('[data-set]').forEach(i => payload[i.dataset.set] = i.value);
        try { await API.post('/admin/settings', payload); toast('Settings saved.', 'ok'); }
        catch (e) { toast(e.message, 'err'); }
      };
    }
  },

  // ---- Immutable audit log ----
  async render_audit(body) {
    body.className = '';
    body.innerHTML = '<div class="muted">Loading…</div>';
    const r = await API.get('/admin/audit-log');
    body.innerHTML = `<div class="card"><h3>📜 Audit Log (append-only)</h3>
      <table class="data"><thead><tr><th>Time</th><th>Actor</th><th>Role</th><th>Action</th><th>Details</th></tr></thead>
      <tbody>${r.entries.map(x => `
        <tr><td>${esc(x.at)}</td><td>${esc(x.actor || '')}</td><td>${esc(x.actor_role || '')}</td>
        <td>${esc(x.action)}</td><td class="muted">${esc(x.details || '')}</td></tr>`).join('')}</tbody></table></div>`;
  },
};
