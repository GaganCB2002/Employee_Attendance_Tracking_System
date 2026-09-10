# AttendX — Photo-Verified, Geofenced Attendance Tracking System (PWA)

Production-ready employee attendance system: camera-verified checkpoints, GPS geofencing,
late-arrival detection, folder-wise admin dashboards, and unified account lockout.
Frontend is an **installable PWA** (manifest + service worker) that also runs in any mobile browser.

## Quick Start

Requirements: **Node.js ≥ 22.5** (uses the built-in `node:sqlite` module — no database install, no native build).

```powershell
cd AttendX
npm install
npm start          # http://localhost:3000
```

Optional — copy `.env.example` to `.env` and set `APP_SECRET`, `PORT`, `DATA_DIR`, and `TLS_CERT`/`TLS_KEY`
for HTTPS (TLS in transit). To reset all data: stop server, delete the `data/` folder, restart.

## Demo Logins (auto-seeded)

| Role | ID | Password | Scope |
|---|---|---|---|
| Super Admin | SUPER01 | Super@123 | Everything + settings + geofences + shifts |
| Section Admin | SA001 | Admin@123 | Production section only |
| Section Admin | SA002 | Admin@123 | Quality Control section only |
| Employee | EMP001–EMP004 | Emp@123 | Checkpoints in their shift |

Seed geofence: "Main Office" at 12.9716, 77.5946, radius 50 m. Update it (📍 Geofences tab)
to your real office coordinates before employee use.

## Feature Map

- **Roles** — Employee / Section Admin / Super Admin, all using one login + unified lockout rule.
- **Onboarding** — Add New Employee (name, ID, section, shift, auto-generated or set password, consent
  checkbox, optional profile photo). Duplicate IDs rejected. Section admins manage only their section;
  super admins everything. Edit / deactivate / reassign (section & shift) supported.
- **Shifts** — configurable, each with name, start, end, and late grace (10–15 min typical). Default 8
  ordered checkpoints per shift (Sign In → Lunch Out → Lunch In → Tea Out → Tea In → Sign Out → 2 custom).
  Admins add unlimited checkpoints; employees cannot skip (server rejects out-of-order, 409).
- **Photo at every checkpoint** — live `getUserMedia` sheet; photo (or up to 2-minute clip). Submission is
  **blocked** without a capture; failures prompt retry. Every record stores media + GPS + timestamp
  + employee/section/shift/checkpoint names.
- **Late detection** — Sign In vs scheduled start + grace → record flagged LATE; shown with one-click
  photo on all dashboards (📁 tree, ⏰ LATE tab).
- **Geofencing** — configurable radius 20–5000 m (default 50 m; 1 m is below real GPS accuracy and would
  constantly false-fail). Employee app validates before each action, blocks outside the fence with a
  popup + red banner, **auto re-enables on re-entry** (30 s watcher + pre-action check), and logs every
  rejection immutably to `geofence_rejections`.
- **Security** — 3 wrong passwords → account locked (employees AND admins, one rule); admins unlock via
  🔓 tab (scoped: section admin → own section). **Back button re-locks the session** (popstate hook) and
  requires password re-entry. Idle sessions auto-expire (configurable, default 15 min). Photos/videos and
  profile photos are **AES-256-GCM encrypted at rest** and served only to scope-authorized viewers;
  TLS enabled via `.env` for transit. Append-only audit log of every event.
- **Delivery** — installable PWA (manifest + SW + generated PNG icons); works directly in mobile browsers
  (HTTPS/localhost required for camera + GPS).
- **NFRs** — photo downscale (≤960 px, JPEG 0.82) keeps capture+submit well under 5 s on 4G; SQLite WAL +
  indexed queries scale to 10k+ employees; ≤3 taps per checkpoint (Capture → shutter → auto-submit);
  consents recorded at onboarding; retention configurable (default 180 days) with automatic purge.

## Advanced Features Included

- CSV export (employee self + admin filtered) · Analytics (punctuality trend, section comparison)
- Shift-swap request/approval workflow · Audit log viewer · Offline detection banner
- Stubbed for a later phase: face-match/liveness, push notifications (SW registered; needs VAPID server),
  full offline sync queue (captures need live GPS/camera, so they're never queued), multi-language.

## API Overview

`POST /api/auth/login` · `POST /api/auth/logout` · `GET/POST /api/auth/session/*` (state/lock/unlock) ·
`GET /api/employee/me` · `POST /api/employee/consent` · `POST /api/employee/geofence/check` ·
`POST /api/employee/cp/checkpoint` · `GET /api/employee/cp/history|media/:uuid|export.csv|swap-request` ·
`GET /api/admin/dashboard|records|analytics|audit-log|lockouts|settings|swaps|export.csv` ·
`POST /api/admin/unlock|swaps/:id|settings` ·
`/api/admin/org/*` (sections, shifts, checkpoints) · `/api/admin/geo/*` (geofences) ·
`/api/admin/employees` (CRUD) · `GET /api/admin/media/:uuid`

## Data Model

`Section`, `Shift`, `Checkpoint`, `Employee`, `AdminUser`, `GeofenceZone`, `AttendanceRecord`
(photo ref, GPS, timestamp, status ON_TIME/LATE), `LoginAttempt`, `Session`, `GeofenceRejection`,
`Consent`, `ShiftSwap`, `AuditLog`, `Settings` — see `server/schema.js`.

## Production Notes

- Serve behind HTTPS (set `TLS_CERT`/`TLS_KEY`) — required in the field for camera/GPS APIs.
- Set a strong random `APP_SECRET` (derives the media-encryption key).
- Back up `data/attendx.db` + `data/media/` (all media encrypted).
