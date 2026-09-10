/* AttendX app controller: login, routing, back-button interception,
   idle session expiry, re-lock, PWA install. */
'use strict';

const App = {
  user: null,          // { role, name, id }
  idleTimer: null,
  deferredInstall: null,

  bindCommon() { /* shared binding hook (logout bound globally) */ },

  // ---- Boot ----
  async init() {
    document.getElementById('btn-logout').onclick = () => this.logout();
    this.registerSW();
    this.setupInstall();
    this.setupBackButton();
    window.addEventListener('online', () => this.updateQueueBanner());
    window.addEventListener('offline', () => this.updateQueueBanner());
    if (API.token) {
      try {
        const st = await API.get('/auth/session/state');
        if (st.locked) { this.resumeAfterRelock(); return; }
        this.user = { role: st.role, name: st.name, id: st.display_id };
        this.enter();
        return;
      } catch (e) { API.setToken(''); }
    }
    this.renderLogin();
  },

  registerSW() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(() => { /* SW optional in dev */ });
    }
  },

  setupInstall() {
    window.addEventListener('beforeinstallprompt', e => {
      e.preventDefault();
      this.deferredInstall = e;
      document.getElementById('install-banner').classList.remove('hidden');
    });
    document.getElementById('btn-install').onclick = async () => {
      if (!this.deferredInstall) return;
      this.deferredInstall.prompt();
      await this.deferredInstall.userChoice;
      this.deferredInstall = null;
      document.getElementById('install-banner').classList.add('hidden');
    };
    document.getElementById('btn-install-dismiss').onclick = () => {
      document.getElementById('install-banner').classList.add('hidden');
    };
  },

  // ---- Back-button interception: Back always re-locks the session ----
  setupBackButton() {
    history.pushState({ ax: 'lock' }, '', location.href);
    window.addEventListener('popstate', () => {
      history.pushState({ ax: 'lock' }, '', location.href); // never let Back exit the app
      if (!this.user) return;
      this.relock('Back navigation detected — session re-locked.');
    });
  },

  async relock(reason) {
    try { await API.post('/auth/session/lock'); } catch (e) { /* session may be gone */ }
    toast(reason || 'Session re-locked. Enter your password to resume.', 'err');
    this.showRelock();
  },

  resumeAfterRelock() { this.showRelock(); },

/* __APP_PART2__ */

  // ---- Relock screen (password re-entry to resume; no Back bypass) ----
  showRelock() {
    const view = document.getElementById('view');
    view.innerHTML = `
      <div class="login-wrap"><div class="card">
        <h2 style="margin-top:0">🔒 Session Re-Locked</h2>
        <p class="muted">${esc(this.user ? this.user.id : '')} — re-enter your password to resume.
          Your ID stays filled; passwords are required (no bypass via Back).</p>
        <label>Password</label><input type="password" id="rl-pw">
        <div class="row" style="margin-top:12px">
          <button class="btn ghost" id="rl-logout">Logout</button>
          <button class="btn primary" id="rl-go" style="flex:1">Resume</button></div>
      </div></div>`;
    document.getElementById('rl-go').onclick = async () => {
      try {
        await API.post('/auth/session/unlock', { password: document.getElementById('rl-pw').value });
        toast('Session resumed.', 'ok');
        this.enter();
      } catch (e) { toast(e.message, 'err'); }
    };
    document.getElementById('rl-logout').onclick = () => this.logout();
  },

  // ---- Login ----
  renderLogin() {
    this.user = null;
    document.getElementById('topbar').classList.add('hidden');
    Geo.stop();
    const view = document.getElementById('view');
    view.innerHTML = `
      <div class="login-wrap">
        <div class="login-logo"><img src="icons/icon.svg" alt="AttendX"><h1>AttendX</h1>
          <p>Photo-Verified, Geofenced Attendance</p></div>
        <div class="card">
          <label>ID (Employee / Section Admin / Super Admin)</label>
          <input id="li-id" placeholder="EMP001, SA001 or SUPER01">
          <label>Password</label>
          <input type="password" id="li-pw" placeholder="Your password">
          <button class="btn primary big" id="li-go" style="margin-top:14px">Login</button>
          <div class="login-demo">Demo logins — Super: SUPER01 / Super@123 ·
            Section: SA001 / Admin@123 · Employee: EMP001 / Emp@123<br>
            3 wrong passwords lock any account (unified rule).</div>
        </div>
      </div>`;
    const go = async () => {
      try {
        const r = await API.post('/auth/login', {
          identity: document.getElementById('li-id').value.trim(),
          password: document.getElementById('li-pw').value,
        });
        API.setToken(r.token);
        this.user = { role: r.role, name: r.name, id: r.id };
        this.enter();
      } catch (e) {
        toast(e.message, 'err');
      }
    };
    document.getElementById('li-go').onclick = go;
    // Property assignment replaces any previous handler (avoids stacking
    // duplicate Enter-key listeners across logins/logouts).
    view.onkeydown = (e) => { if (e.key === 'Enter' && e.target && e.target.tagName === 'INPUT') go(); };
  },

  forceLogout(msg) {
    API.setToken('');
    this.user = null;
    document.getElementById('topbar').classList.add('hidden');
    if (msg) toast(msg, 'err');
    closeModal();
    this.renderLogin();
  },

  async logout() {
    try { await API.post('/auth/logout'); } catch (e) { /* ignore */ }
    this.forceLogout('Logged out.');
  },

  // ---- Idle session expiry (configurable, default 15 min) ----
  resetIdle() {
    if (this.idleTimer) clearTimeout(this.idleTimer);
    this.idleTimer = setTimeout(() => {
      API.setToken('');
      this.forceLogout('Session expired after idle timeout. Please log in again.');
    }, 15 * 60 * 1000);
  },

  // ---- Main app entry ----
  async enter() {
    document.getElementById('topbar').classList.remove('hidden');
    document.getElementById('who-name').textContent = this.user.name;
    document.getElementById('who-role').textContent = this.user.role.replace('_', ' ');
    document.getElementById('install-banner').classList.add('hidden');
    this.resetIdle();
    if (!this._idleBound) {
      this._idleBound = true;
      ['click', 'keydown', 'touchstart'].forEach(ev =>
        document.addEventListener(ev, () => this.resetIdle(), { passive: true }));
    }
    const view = document.getElementById('view');
    if (this.user.role === 'EMPLOYEE') {
      Geo.start();
      Geo.banner();
      try { await Employee.load(); Employee.render(view); }
      catch (e) { view.innerHTML = `<div class="card">⚠️ ${esc(e.message)}</div>`; }
    } else {
      Geo.stop();
      Admin.render(view);
    }
    this.updateQueueBanner();
  },

  updateQueueBanner() {
    const b = document.getElementById('queue-banner');
    if (!navigator.onLine) {
      b.classList.remove('hidden');
      b.textContent = '📴 Offline — checkpoint actions require live GPS + camera; reconnect to log attendance.';
    } else {
      b.classList.add('hidden');
    }
  },
};

document.addEventListener('DOMContentLoaded', () => App.init());
