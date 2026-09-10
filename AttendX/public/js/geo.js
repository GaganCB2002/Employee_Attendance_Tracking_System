/* Geofence: GPS watcher with auto re-enable on re-entry.
   Note: browser GPS accuracy is typically 10-50m, so zones use configurable
   radius >= 20m (default 50m) — a 1m radius would false-fail constantly. */
'use strict';

const Geo = {
  pos: null,
  inside: null,          // null = unknown, true/false after server check
  zone: null,
  watching: false,
  lastCheck: 0,
  _timer: null,
  listeners: [],

  onChange(fn) { this.listeners.push(fn); },
  emit() { this.listeners.forEach(f => f(this.inside, this.zone, this.pos)); },

  banner() {
    const b = document.getElementById('geo-banner');
    if (this.inside === null) {
      b.classList.add('hidden'); return;
    }
    b.classList.remove('hidden');
    if (this.inside) {
      b.classList.add('inside');
      b.textContent = `📍 In zone: ${this.zone ? this.zone.name : 'office'} — checkpoint actions enabled` +
        (this.zone ? ` (${this.zone.radius_m} m radius)` : '');
    } else {
      b.classList.remove('inside');
      b.textContent = `⛔ You are outside the office location${this.zone ? ' (' + this.zone.name + ')' : ''}. ` +
        `Move within ${this.zone ? this.zone.radius_m : ''} m to continue.`;
    }
  },

  getPosition() {
    return new Promise((resolve, reject) => {
      if (!('geolocation' in navigator)) return reject(new Error('GPS not supported on this device'));
      navigator.geolocation.getCurrentPosition(
        p => resolve(p.coords),
        err => reject(new Error('Unable to read GPS: ' + err.message)),
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 15000 });
    });
  },

  async checkNow() {
    if (!App || !App.user || App.user.role === 'SUPER_ADMIN' || App.user.role === 'SECTION_ADMIN') {
      // Geofence applies to employees; admins skip.
      return { inside: true, zone: null };
    }
    try {
      const c = await this.getPosition();
      this.pos = c;
      const r = await API.post('/employee/geofence/check', {
        latitude: c.latitude, longitude: c.longitude,
        accuracy: c.accuracy, checkpoint_name: null,
      });
      const was = this.inside;
      this.inside = r.inside; this.zone = r.zone;
      if (was !== this.inside) this.emit();
      this.banner();
      this.lastCheck = Date.now();
      return r;
    } catch (e) {
      toast(e.message, 'err');
      return { inside: false, error: e.message };
    }
  },

  // Continuous watch: re-validates every 30s; re-entry auto re-enables actions.
  start() {
    if (this.watching) return;
    this.watching = true;
    this.checkNow();
    this._timer = setInterval(() => {
      if (!App || !App.user || App.user.role !== 'EMPLOYEE') { this.stop(); return; }
      this.checkNow();
    }, 30000);
  },

  stop() {
    this.watching = false;
    if (this._timer) { clearInterval(this._timer); this._timer = null; }
    this.inside = null; this.zone = null;
    this.banner();
  },
};
