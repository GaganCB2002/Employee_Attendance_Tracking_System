# AttendX Database Architecture

This directory contains the complete database code, SQL DDL schemas, seed data, query library, and initialization scripts for **AttendX**.

---

## 1. Directory Contents

| File | Description |
|---|---|
| [`schema.sql`](file:///d:/bssc/Employee_Attendance_Tracking_System/database/schema.sql) | Full, self-contained SQL DDL containing all 11 tables, constraints, foreign keys, and performance indexes (PostgreSQL & ANSI SQL compliant). |
| [`seed.sql`](file:///d:/bssc/Employee_Attendance_Tracking_System/database/seed.sql) | Complete SQL INSERT statements for sections, 6 shifts, 8 checkpoints per shift, geofences, admin accounts, employees, and settings. |
| [`queries.js`](file:///d:/bssc/Employee_Attendance_Tracking_System/database/queries.js) | Production SQL query library covering authentication, 3-strike lockout, checkpoint validation, late arrival checks, geofence radius math, folder tree queries, and ops telemetry aggregates. |
| [`schema.js`](file:///d:/bssc/Employee_Attendance_Tracking_System/database/schema.js) | Programmatic database initialization module with automatic foreign key enforcement and table creation. |
| [`init.js`](file:///d:/bssc/Employee_Attendance_Tracking_System/database/init.js) | Standalone database runner script (`node database/init.js`) to verify and initialize database tables. |

---

## 2. Table Entities & Relationships

### Core Relational Schema
```
                      ┌───────────────┐
                      │   sections    │
                      └───────┬───────┘
                              │ 1:N
        ┌─────────────────────┼─────────────────────┐
        │ 1:N                 │ 1:N                 │ 1:N
 ┌──────▼───────┐      ┌──────▼───────┐      ┌──────▼───────┐
 │ admin_users  │      │  employees   │      │geofence_zones│
 └──────────────┘      └──────┬───────┘      └──────────────┘
                              │
               ┌──────────────┤ (Assigned Shift)
               │              │
        ┌──────▼───────┐      │
        │    shifts    │      │
        └──────┬───────┘      │
               │ 1:N          │
        ┌──────▼───────┐      │
        │ checkpoints  │      │
        └──────┬───────┘      │
               │              │
               │ 1:N          │ 1:N
        ┌──────▼──────────────▼───────┐
        │     attendance_records      │
        └─────────────────────────────┘
```

### Table Definitions

1. **`sections`**: Company departments / squads (e.g. `Sec-A / Flow-1`, Avionics, Propulsion, Telemetry).
2. **`shifts`**: 6 configurable daily shifts with start time, end time, and late-arrival grace period (default 15 mins).
3. **`checkpoints`**: 8 sequential checkpoints per shift (`Sign In`, `Lunch Out`, `Lunch In`, `Tea Out`, `Tea In`, `Sign Out`, `Custom 1`, `Custom 2`). Enforced strictly in ascending order.
4. **`admin_users`**: Admin accounts (`SUPER_ADMIN` with universal access, `SECTION_ADMIN` scoped to own section).
5. **`employees`**: Employee accounts with employee ID code, assigned section, assigned shift, and password hash.
6. **`geofence_zones`**: Registered office locations with center latitude/longitude and allowable radius (default 50m).
7. **`attendance_records`**: Core telemetry logs containing photo verification URL, GPS coordinates, accuracy, geofence status (`INSIDE`/`OUTSIDE`), and attendance status (`ON_TIME`, `LATE`, `BREACH`, `BREAK`).
8. **`login_attempts`**: Audit table logging every credential attempt. Powers the **3-strike lockout policy**.
9. **`geofence_rejections`**: Audit table logging every perimeter breach attempt with calculated breach meters.
10. **`audit_log`**: Permanent system event log (logins, lockouts, unlocks, exception approvals).
11. **`settings`**: Key-value system configurations (session timeout, lockout threshold, default radius, retention days).

---

## 3. How to Run & Initialize

### Run Database Verification & Setup:
```bash
node database/init.js
```

### Execute Raw SQL into PostgreSQL:
```bash
psql -U postgres -d attendx -f database/schema.sql
psql -U postgres -d attendx -f database/seed.sql
```

### Use with Prisma ORM:
The schema is also configured in `backend/prisma/schema.prisma` for live ORM queries across the Express server.
