# AttendX — Photo-Verified, Geofenced Attendance Tracking System

A production-ready, installable PWA for employee attendance tracking with photo verification and GPS geofencing.

## Features

- **3 Roles**: Employee, Section Admin, Super Admin
- **Photo Capture**: Camera-based photo verification at every checkpoint
- **GPS Geofencing**: Configurable office location zones with radius validation
- **Late Detection**: Automatic flagging based on shift start time + grace period
- **Checkpoint Enforcement**: Sequential checkpoint completion (no skipping)
- **Folder-Wise Dashboard**: Section → Employee → Date → Checkpoint hierarchy
- **Security**: 3-attempt lockout, session timeout, back-button interception
- **PWA**: Installable as a Progressive Web App

## Prerequisites

- **Node.js >= 22.5.0** (uses built-in `node:sqlite`)
- No native compilation required (no Visual Studio needed)

## Quick Start

```bash
# Install dependencies
npm install

# Start the server
npm start
```

The server starts at **http://localhost:3000**

## Default Credentials

| Role | Username | Password |
|------|----------|----------|
| Super Admin | `superadmin` | `admin123` |
| Section Admin | `engadmin` | `section123` |

## Project Structure

```
├── server/
│   ├── index.js      # Express server with all API routes
│   ├── db.js         # SQLite database (node:sqlite, auto-seeded)
│   └── auth.js       # JWT auth, lockout, session management
├── public/
│   ├── index.html    # SPA entry point
│   ├── manifest.json # PWA manifest
│   ├── sw.js         # Service worker for offline support
│   ├── css/app.css   # Application styles
│   ├── js/app.js     # Frontend JavaScript
│   └── icons/        # PWA icons
├── data/             # SQLite DB + uploaded media (auto-created)
├── package.json
└── gen-icons.js      # Icon generator script
```

## API Endpoints

### Auth
- `POST /api/auth/login` — Login with username/password
- `GET /api/auth/me` — Get current user info

### Sections
- `GET /api/sections` — List sections
- `POST /api/sections` — Create section (admin+)
- `PUT /api/sections/:id` — Update section
- `DELETE /api/sections/:id` — Delete section (super admin)

### Shifts
- `GET /api/shifts` — List shifts
- `POST /api/shifts` — Create shift with default checkpoints (super admin)
- `PUT /api/shifts/:id` — Update shift
- `DELETE /api/shifts/:id` — Delete shift

### Checkpoints
- `GET /api/checkpoints/:shiftId` — List checkpoints for a shift
- `POST /api/checkpoints` — Add custom checkpoint (super admin)

### Employees
- `GET /api/employees` — List employees (section-scoped for section admin)
- `POST /api/employees` — Add employee with photo upload
- `PUT /api/employees/:id` — Edit employee
- `PUT /api/employees/:id/photo` — Update employee photo
- `POST /api/employees/:id/unlock` — Unlock locked account

### Geofences
- `GET /api/geofences` — List active geofence zones
- `POST /api/geofences` — Create geofence zone (super admin)
- `PUT /api/geofences/:id` — Update zone
- `DELETE /api/geofences/:id` — Delete zone

### Attendance
- `POST /api/attendance/checkpoint` — Submit checkpoint (photo + GPS)
- `GET /api/attendance` — Query attendance records
- `GET /api/attendance/folder` — Folder-wise attendance view
- `GET /api/attendance/my` — Today's records for logged-in employee

### Settings & Audit
- `GET /api/settings` — Get system settings
- `PUT /api/settings` — Update settings
- `GET /api/audit` — Audit log (super admin)
- `GET /api/geofence-rejections` — Rejection log

## Data Model

- **sections** — Company sections (Engineering, Operations, etc.)
- **shifts** — Work shifts with start/end times and grace periods
- **checkpoints** — Sequential checkpoints per shift (Sign In, Lunch, Tea, Sign Out, Custom)
- **employees** — Employee profiles with photos and credentials
- **admin_users** — Admin accounts (section_admin, super_admin)
- **attendance_records** — Photo-verified attendance entries with GPS
- **geofence_zones** — Configurable office location zones
- **geofence_rejections** — Log of failed geofence checks
- **login_attempts** — Login attempt history
- **audit_log** — System audit trail
- **settings** — Configurable system settings

## Configuration

Environment variables (optional, via `.env`):

```
PORT=3000
JWT_SECRET=your-secret-key
SESSION_TIMEOUT=15
```

## PWA Installation

1. Open http://localhost:3000 in a mobile browser
2. Tap "Add to Home Screen" when prompted
3. Or use the browser's install prompt

## License

MIT
