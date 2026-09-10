/* AttendX API client + shared UI helpers */
'use strict';

const API = {
  token: localStorage.getItem('ax_token') || '',
  setToken(t) { this.token = t || ''; if (t) localStorage.setItem('ax_token', t); else localStorage.removeItem('ax_token'); },

  async req(path, opts = {}) {
    const headers = Object.assign({ 'Content-Type': 'application/json' }, opts.headers || {});
    if (this.token) headers.Authorization = 'Bearer ' + this.token;
    let res;
    try {
      res = await fetch('/api' + path, { ...opts, headers });
    } catch (e) {
      throw new Error('Network unavailable. Check your connection.');
    }
    if (res.status === 401 && !path.startsWith('/auth/login')) {
      App.forceLogout('Session expired. Please log in again.');
      throw new Error('Session expired');
    }
    const ct = res.headers.get('content-type') || '';
    let data = null;
    try { data = ct.includes('json') ? await res.json() : await res.text(); }
    catch (e) { /* non-JSON body */ }

    if (res.status === 423) {
      // 423 = session re-locked (only meaningful with an active session) OR
      // a locked account during login. Only show the re-lock screen when a
      // real session exists; during login just surface the server message.
      if (App.user) App.showRelock();
      throw new Error((data && data.error) || 'Session re-locked. Enter your password to resume.');
    }
    if (!res.ok) throw new Error((data && data.error) || `Request failed (${res.status})`);
    return data;
  },
  get(p) { return this.req(p); },
  post(p, body) { return this.req(p, { method: 'POST', body: JSON.stringify(body || {}) }); },
  put(p, body) { return this.req(p, { method: 'PUT', body: JSON.stringify(body || {}) }); },
  del(p) { return this.req(p, { method: 'DELETE' }); },
};

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function toast(msg, kind) {
  const el = document.createElement('div');
  el.className = 'toast' + (kind ? ' ' + kind : '');
  el.textContent = msg;
  document.getElementById('toast-root').appendChild(el);
  setTimeout(() => el.remove(), 4000);
}

function modal(html) {
  const root = document.getElementById('modal-root');
  root.innerHTML = `<div class="modal-overlay"><div class="modal">${html}</div></div>`;
  root.querySelector('.modal-overlay').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeModal();
  });
  return root.querySelector('.modal');
}
function closeModal() { document.getElementById('modal-root').innerHTML = ''; }

function confirmDialog(msg, onYes) {
  const m = modal(`<h3>Confirm</h3><p>${esc(msg)}</p>
    <div class="row" style="justify-content:flex-end">
      <button class="btn ghost" id="cf-no">Cancel</button>
      <button class="btn danger" id="cf-yes">Confirm</button></div>`);
  m.querySelector('#cf-no').onclick = closeModal;
  m.querySelector('#cf-yes').onclick = () => { closeModal(); onYes(); };
}

function mediaUrl(uuid) { return '/api/admin/media/' + encodeURIComponent(uuid); }

function fmtRecMedia(uuid) { return '/api/employee/cp/media/' + encodeURIComponent(uuid); }
