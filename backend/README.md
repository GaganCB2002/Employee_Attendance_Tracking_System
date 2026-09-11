# AttendX Backend API

Production-ready backend API for AttendX, an employee attendance tracking system with photo-verified checkpoints, GPS geofencing, late-arrival detection, and real-time Socket.IO telemetry streaming.

## Tech Stack
- **Runtime:** Node.js >= 20
- **Framework:** Express 4.x
- **Database:** PostgreSQL via Prisma ORM
- **Real-Time:** Socket.IO v4 (Namespace: `/ops` and root telemetry)
- **Security:** JWT Auth, 3-strike lockout policy, Section scoping
- **Storage:** Local file storage (S3 compatible abstraction layer)

## Prerequisites
- PostgreSQL running locally or in container (default: `localhost:5432`)
- Node.js >= 20

## Setup & Running

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure Environment:**
   Copy `.env.example` to `.env` and verify database URL:
   ```env
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/attendx?schema=public
   PORT=4000
   JWT_SECRET=attendx_super_secret_jwt_key_2026_telemetry_ops
   ```

3. **Initialize Database & Seed Data:**
   ```bash
   # Push Prisma schema to Postgres
   npx prisma db push

   # Seed initial admin accounts, shifts, 15 employees, and checkpoints
   node prisma/seed.js
   ```

4. **Start Development Server:**
   ```bash
   npm run dev
   ```
   Server will start at `http://localhost:4000`.

## Default Credentials
- **Super Admin:** `superadmin` / `admin123`
- **Section Admin (Avionics):** `engadmin` / `section123`
- **Employee Accounts:** `EMP-90000` to `EMP-91918` / `employee123`
