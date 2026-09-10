/* Employee app: consent, checkpoint flow (3 taps or fewer), history, export, swap */
'use strict';

const Employee = {
  me: null,

  async load() {
    this.me = await API.get('/employee/me');
    return this.me;
  },

  // ---- Consent screen (onboarding requirement) ----
  renderConsent(view) {
    view.innerHTML = `
      <div class="card">
        <h2>📸 Consent Required</h2>
        <p>AttendX verifies your attendance using <b>photos captured at every checkpoint</b> and
        <b>your device location (GPS)</b>.</p>
        <p>• Your photo is captured each time you log a checkpoint (Sign In, breaks, Sign Out).<br>
        • Your GPS position is validated against the registered office geofence.<br>
        • Captures are encrypted and retained for <b>${this.me.retention_days} days</b> (configurable).</p>
        <p class="muted">You cannot log attendance without granting consent.</p>
        <div class="row" style="margin-top:12px">
          <button class="btn ok big" id="btn-consent-accept">I Consent — Enable Attendance</button>
        </div>
      </div>`;
    document.getElementById('btn-consent-accept').onclick = async () => {
      await API.post('/employee/consent', { accepted: true });
      toast('Consent recorded. Attendance enabled.', 'ok');
      await this.load();
      this.render(view);
    };
  },

  // ---- Main employee screen: checkpoint list ----
  render(view) {
    if (!this.me.consent_given) return this.renderConsent(view);
    const cps = this.me.shift.checkpoints;
    const lastDone = Math.max(0, ...this.me.today_records.map(r => r.sequence));
    const nextCp = cps.find(c => c.sequence === lastDone + 1);
    const sh = this.me.shift;

    view.innerHTML = `
      <div class="card">
        <h2 style="margin:0">${esc(this.me.name)}</h2>
        <div class="muted">${esc(this.me.employee_id)} · ${esc(this.me.section)} ·
          ${esc(sh.name)} (${esc(sh.start_time)}–${esc(sh.end_time)}, grace ${sh.late_grace_minutes} min)</div>
        <div class="muted" style="margin-top:8px">Late rule: Sign In after ${esc(sh.start_time)}
          + ${sh.late_grace_minutes} min grace is flagged <b>LATE</b>.</div>
      </div>
      <div class="card">
        <h3>Today's Checkpoints — in order</h3>
        <div id="cp-list">${cps.map(c => this._cpItem(c, nextCp)).join('')}</div>
        <div class="muted" style="margin-top:8px">Checkpoints cannot be skipped — each requires a
          fresh photo capture + GPS inside the office geofence.</div>
      </div>
      <div class="card">
        <h3>My Attendance</h3>
        <div class="row">
          <button class="btn ghost" id="btn-history">History</button>
          <a class="btn ghost" href="/api/employee/cp/export.csv">⬇ Export CSV</a>
          <button class="btn ghost" id="btn-swap">Request Shift Swap</button>
        </div>
      </div>`;
    App.bindCommon(view);

    document.querySelectorAll('[data-action="do"]').forEach(btn => {
      btn.onclick = () => this.doCheckpoint(btn.closest('[data-cp]').dataset.cp);
    });
    document.querySelectorAll('.cp-thumb').forEach(img => {
      img.onclick = () => this.viewCapture(img.dataset.view);
    });
    document.getElementById('btn-history').onclick = () => this.renderHistory();
    document.getElementById('btn-swap').onclick = () => this.renderSwap();
  },

  _cpItem(c, nextCp) {
    const rec = (this.me.today_records || []).find(r => r.sequence === c.sequence);
    const isNext = nextCp && nextCp.id === c.id;
    const mediaSrc = rec ? fmtRecMedia(rec.media_uuid) : null;
    return `
      <div class="cp-item ${rec ? 'done' : ''} ${isNext ? 'next' : ''} ${!rec && !isNext ? 'locked' : ''}" data-cp="${c.id}">
        <div class="num">${c.sequence}</div>
        <div class="meta">
          <div class="nm">${esc(c.name)}
            ${rec ? (rec.status === 'LATE' ? '<span class="pill LATE">LATE</span>' : '<span class="pill ONTIME">ON TIME</span>') : ''}</div>
          <div class="sub">${rec ? `Logged at ${esc(rec.checkpoint_time)}` : isNext ? 'Next required action' : 'Locked until previous is done'}</div>
        </div>
        ${mediaSrc ? `<img class="cp-thumb" src="${mediaSrc}" data-view="${rec.id}" alt="capture">`
          : isNext ? '<button class="btn primary" data-action="do">📷 Capture</button>' : ''}
      </div>`;
  },

/* __EMPLOYEE_PART2__ */

  // 3-tap flow: 1) Capture; 2) shutter; 3) auto-submit.
  async doCheckpoint(cpId) {
    const geoCheck = await Geo.checkNow();
    if (!geoCheck.inside) {
      toast(geoCheck.message || 'You are outside the office location.', 'err');
      return;
    }
    let capture;
    try {
      capture = await Camera.open(); // blocks UI; if capture fails, must retry
    } catch (e) {
      return; // user cancelled or camera failed (toast already shown)
    }
    if (!capture || !capture.media_b64) {
      toast('Capture failed — please retry. Checkpoint cannot be logged without a photo.', 'err');
      return;
    }
    try {
      const c = Geo.pos || await Geo.getPosition();
      const rec = await API.post('/employee/cp/checkpoint', {
        checkpoint_id: cpId,
        latitude: c.latitude, longitude: c.longitude, accuracy: c.accuracy,
        client_time: new Date().toISOString().slice(0, 16),
        media_b64: capture.media_b64, media_type: capture.media_type,
      });
      toast(`${rec.checkpoint} logged — ${rec.status === 'LATE' ? 'flagged LATE' : 'ON TIME'}`,
        rec.status === 'LATE' ? 'err' : 'ok');
    } catch (e) {
      toast(e.message, 'err');
    }
    await this.load();
    this.render(document.getElementById('view'));
  },

  viewCapture(recId) {
    const rec = (this.me.today_records || []).find(r => r.id === +recId);
    if (!rec) return;
    modal(`<h3>${esc(rec.checkpoint_name)}</h3>
      <img class="full" src="${fmtRecMedia(rec.media_uuid)}" alt="capture">
      <p class="muted">Time: ${esc(rec.checkpoint_time)} · GPS: ${rec.latitude.toFixed(5)}, ${rec.longitude.toFixed(5)}
        · Status: ${esc(rec.status)}</p>
      <div class="row" style="justify-content:flex-end"><button class="btn ghost" onclick="closeModal()">Close</button></div>`);
  },

  renderHistory() {
    modal('<h3>My History</h3><div id="hist-body" class="muted">Loading…</div>');
    API.get('/employee/cp/history').then(r => {
      const body = document.getElementById('hist-body');
      if (!r.records.length) { body.textContent = 'No records yet.'; return; }
      const byDate = {};
      for (const x of r.records) (byDate[x.work_date] = byDate[x.work_date] || []).push(x);
      body.innerHTML = Object.entries(byDate).map(([d, recs]) => `
        <div class="folder open"><div class="folder-head">📅 ${esc(d)}
          <span class="late-flag" ${recs.some(x => x.status === 'LATE') ? '' : 'style="display:none"'}>
            ${recs.filter(x => x.status === 'LATE').length} LATE</span></div>
        <div class="folder-body">${recs.map(x => `
          <div class="rec-row ${x.status === 'LATE' ? 'late' : ''}">
            <img class="rec-thumb" src="${fmtRecMedia(x.media_uuid)}" data-uuid="${x.media_uuid}">
            <div><b>${esc(x.checkpoint_name)}</b><div class="muted">${esc(x.checkpoint_time)}</div></div>
            <span class="pill ${x.status === 'LATE' ? 'LATE' : 'ONTIME'}">${x.status}</span>
          </div>`).join('')}</div></div>`).join('');
      body.querySelectorAll('.rec-thumb').forEach(img => {
        img.onclick = () => {
          modal(`<h3>Capture</h3><img class="full" src="${fmtRecMedia(img.dataset.uuid)}">
            <div class="row" style="justify-content:flex-end"><button class="btn ghost" onclick="closeModal()">Close</button></div>`);
        };
      });
    }).catch(e => { document.getElementById('hist-body').textContent = e.message; });
  },

  renderSwap() {
    API.get('/employee/shifts').then(r => {
      const m = modal(`<h3>Request Shift Swap</h3>
        <label>Target shift</label>
        <select id="sw-shift">${r.shifts.map(s =>
          `<option value="${s.id}">${esc(s.name)} (${esc(s.start_time)}–${esc(s.end_time)})</option>`).join('')}</select>
        <label>Date</label><input type="date" id="sw-date" value="${new Date().toISOString().slice(0, 10)}">
        <label>Reason</label><textarea id="sw-reason"></textarea>
        <div class="row" style="justify-content:flex-end;margin-top:12px">
          <button class="btn ghost" onclick="closeModal()">Cancel</button>
          <button class="btn primary" id="sw-send">Submit</button></div>`);
      m.querySelector('#sw-send').onclick = async () => {
        try {
          await API.post('/employee/cp/swap-request', {
            to_shift_id: +m.querySelector('#sw-shift').value,
            work_date: m.querySelector('#sw-date').value,
            reason: m.querySelector('#sw-reason').value,
          });
          closeModal(); toast('Swap request submitted for approval.', 'ok');
        } catch (e) { toast(e.message, 'err'); }
      };
    }).catch(e => toast(e.message, 'err'));
  },
};
