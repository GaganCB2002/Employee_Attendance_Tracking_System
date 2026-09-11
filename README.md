# AttendX — Photo-Verified, Geofenced Attendance Tracking System

Production-ready employee attendance tracking system with photo-verified checkpoints, GPS geofencing, late-arrival detection, and a live dark telemetry ops monitoring dashboard.

---

## 1. Architecture Overview

- **Backend:** Node.js + Express 4.x, PostgreSQL via Prisma ORM, Socket.IO v4 real-time event streaming, JWT authentication, 3-strike security lockout middleware, Haversine GPS geofence engine.
- **Frontend:** React 18 (Vite 6), Tailwind CSS v3, Zustand 5 state management, Socket.IO client, Lucide icons, installable PWA (Web Manifest + Service Worker).
- **Storage:** S3-compatible abstraction layer with local storage fallback (`uploads/`).

---

## 2. Directory Structure

```
Employee_Attendance_Tracking_System/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma             # PostgreSQL schema (8 models + enums)
│   │   └── seed.js                   # Seed script (admins, shifts, 15 employees, records)
│   ├── src/
│   │   ├── index.js                  # App entrypoint, Express + Socket.IO bootstrap
│   │   ├── config/
│   │   │   ├── db.js                 # Prisma client instance
│   │   │   └── env.js                # Environment config loader
│   │   ├── models/                   # Domain model helpers
│   │   │   ├── employee.model.js
│   │   │   ├── section.model.js
│   │   │   ├── shift.model.js
│   │   │   ├── checkpoint.model.js
│   │   │   ├── attendanceRecord.model.js
│   │   │   ├── geofenceZone.model.js
│   │   │   ├── loginAttempt.model.js
│   │   │   └── adminUser.model.js
│   │   ├── controllers/
│   │   │   ├── auth.controller.js        # Universal login, logout, lockout check
│   │   │   ├── employee.controller.js    # Add/edit/unlock/scope employees
│   │   │   ├── checkpoint.controller.js  # Submit checkpoint (photo+gps+sequence)
│   │   │   ├── attendance.controller.js  # Filter records, folder structure, approve
│   │   │   ├── geofence.controller.js    # Zone CRUD + coordinate validator
│   │   │   └── admin.controller.js       # Telemetry aggregates, lockouts, audit
│   │   ├── routes/
│   │   │   ├── auth.routes.js
│   │   │   ├── employee.routes.js
│   │   │   ├── attendance.routes.js
│   │   │   ├── geofence.routes.js
│   │   │   └── admin.routes.js
│   │   ├── middleware/
│   │   │   ├── authMiddleware.js         # JWT verification & session resolution
│   │   │   ├── roleMiddleware.js         # Super Admin vs Section Admin scoping
│   │   │   └── lockoutMiddleware.js      # 3-strike lockout policy enforcement
│   │   ├── services/
│   │   │   ├── lateDetection.service.js  # Shift start + grace period comparison
│   │   │   ├── geofence.service.js       # Haversine distance vs allowable radius
│   │   │   ├── photoStorage.service.js   # Multer + Base64 storage abstraction
│   │   │   └── notification.service.js  # Telemetry & security alerts
│   │   ├── sockets/
│   │   │   └── liveEvents.socket.js      # Real-time WebSocket event broadcaster
│   │   └── utils/
│   │       ├── haversine.js              # Haversine distance math
│   │       └── validators.js             # Input validation helpers
│   ├── .env.example
│   ├── .env
│   ├── README.md
│   └── package.json
│
├── frontend/
│   ├── public/
│   │   ├── favicon.svg
│   │   ├── manifest.json             # PWA installable manifest
│   │   └── service-worker.js         # Service worker offline cache
│   ├── src/
│   │   ├── main.jsx                  # React DOM root
│   │   ├── App.jsx                   # React Router + back-button interceptor
│   │   ├── index.css                 # Tailwind directives + dark telemetry theme
│   │   ├── api/
│   │   │   ├── client.js             # Axios client with JWT interceptors
│   │   │   ├── auth.js               # Auth API calls
│   │   │   └── attendance.js         # Telemetry & Checkpoint API calls
│   │   ├── hooks/
│   │   │   ├── useGeolocation.js     # Live device GPS watcher
│   │   │   ├── useSocket.js          # Socket.IO live stream & ping tracker
│   │   │   └── useAuth.js            # Authentication state hook
│   │   ├── store/
│   │   │   ├── authStore.js          # Zustand auth store
│   │   │   └── attendanceStore.js    # Zustand live telemetry & records store
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── Sidebar.jsx       # Navigation drawer
│   │   │   │   └── TopNav.jsx        # Telemetry status bar (RTK latency, Zulu clock)
│   │   │   ├── employee/
│   │   │   │   ├── CheckpointButton.jsx # 1-Tap checkpoint action button
│   │   │   │   ├── CameraCapture.jsx    # Webcam frame capture + liveness guide
│   │   │   │   └── ShiftStatus.jsx      # Sequential steps progression
│   │   │   ├── admin/
│   │   │   │   ├── AddEmployeeForm.jsx  # Employee onboarding form
│   │   │   │   └── SectionFolderTree.jsx# Section → Employee → Date → Checkpoints
│   │   │   └── dashboard/
│   │   │       ├── StatCard.jsx         # Telemetry counter card
│   │   │       ├── LiveEventFlash.jsx   # Photo preview of flagged event + approve
│   │   │       ├── EventStream.jsx      # Filterable live attendance roster
│   │   │       ├── GeofenceRadar.jsx    # SVG perimeter radar with live blips
│   │   │       └── LockoutTable.jsx     # Security lockout table with unlock buttons
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx            # Multi-role authentication with 3-strike alert
│   │   │   ├── EmployeeCheckInPage.jsx  # Checkpoint verification & submission flow
│   │   │   ├── AdminLiveMonitor.jsx     # Main dark telemetry ops dashboard
│   │   │   ├── GeofencingPage.jsx       # Perimeter manager + coordinate sandbox
│   │   │   ├── ShiftEnginePage.jsx      # Daily shifts & checkpoint sequence editor
│   │   │   └── AuditTrailPage.jsx       # Immutable audit logs & folder operations
│   │   └── utils/
│   │       └── time.js                  # Zulu time, AM/PM formatting, pad utils
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── vite.config.js
│   ├── index.html
│   ├── README.md
│   └── package.json
└── README.md
```

---

## 3. Quick Start Instructions

### Prerequisites
- **Node.js:** >= 20.0.0
- **PostgreSQL:** Running locally or via Docker on port `5432`

---

### Step 1: Start Backend API & Database

```bash
# Navigate to backend
cd backend

# Install dependencies
npm install

# Setup database schema with Prisma (Postgres)
npx prisma db push

# Seed initial admin users, shifts, geofence zones, 15 employees, and sample data
node prisma/seed.js

# Start backend server (starts on http://localhost:4000)
npm run dev
```

---

### Step 2: Start Frontend Application

In a new terminal:

```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Start Vite development server
npm run dev
```

Open your browser at **`http://localhost:5173`**.

---

## 4. Default Credentials & Test Scenarios

| Role | Identifier / User | Password | Accessible Views |
|---|---|---|---|
| **Super Admin** | `superadmin` | `admin123` | Universal Ops Dashboard across all 6 sections, Geofencing, Shifts, Audit logs, Unlock any account |
| **Section Admin (Avionics)** | `engadmin` | `section123` | Scoped to Sec-A / Flow-1 personnel and records |
| **Employee (Marcus Chen)** | `EMP-9000` | `employee123` | Checkpoint verification flow, camera snapshot, GPS geofence validation |
| **Locked Account (Owen Brennan)** | `EMP-10644` | `employee123` | Locked by 3-strike policy (triggers lockout alert on login) |

---

## 5. Key System Behaviors Verified

1. **Mandatory Photo Verification:** Checkpoint submissions require an image file or base64 webcam capture.
2. **GPS Geofencing:** Device coordinates are measured against active office perimeters via the Haversine formula. Submissions outside perimeter radius are rejected with exact breach meters logged.
3. **Late-Arrival Detection:** For Sign In checkpoints, `actualTime > shiftStart + gracePeriod (15m)` flags the record as `LATE` and triggers telemetry photo flash on admin dashboards.
4. **Sequence Enforcement:** Checkpoint sequence order is strictly enforced per shift (e.g. Sign In -> Lunch Out -> Lunch In -> Tea Out -> Tea In -> Sign Out). Skipping ahead is blocked.
5. **3-Strike Lockout Policy:** 3 consecutive failed login attempts immediately lock the account (`status = LOCKED`), broadcast a real-time security alert, and require a Section Admin or Super Admin to unlock.
6. **Real-Time Telemetry Streaming:** Socket.IO broadcasts every new checkpoint record, lockout event, and breach alert directly to connected admin dashboards.
