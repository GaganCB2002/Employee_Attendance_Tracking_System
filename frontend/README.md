# AttendX Frontend (React + Vite + Tailwind CSS + Zustand + Socket.IO)

Production-ready frontend for AttendX with dark ops telemetry UI, photo verification webcam integration, real-time Socket.IO telemetry streaming, GPS geofencing radar, and PWA installability.

## Tech Stack
- **Framework:** React 18 + Vite 6
- **Styling:** Tailwind CSS v3
- **State Management:** Zustand
- **Real-Time:** Socket.IO client v4
- **Icons:** Lucide React
- **PWA:** Web App Manifest + Service Worker

## Running Locally

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start Vite development server:**
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173` in your browser.

3. **Production Build:**
   ```bash
   npm run build
   ```

## Roles & Navigation
- **Super Admin (`superadmin` / `admin123`):** Universal telemetry ops dashboard across all 6 sections, geofence manager, shift engine, audit logs.
- **Section Admin (`engadmin` / `section123`):** Section-scoped dashboard for Avionics squad.
- **Employee (`EMP-90000` / `employee123`):** Checkpoint submission screen with GPS geofence radar verification, camera capture, and shift progress tracker.
