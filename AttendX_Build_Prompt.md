# Build Prompt: AttendX — Photo-Verified, Geofenced Attendance Tracking System

You are building a **fully working, production-ready web application** called **AttendX**, an employee attendance tracking system. It must be delivered as an **installable Progressive Web App (PWA)**. Implement every feature below — do not skip or simplify silently; if something can't be built exactly as described (e.g. GPS precision), implement the closest realistic version and say so.

## 1. Roles
- **Employee** — logs in, performs checkpoint actions during their shift.
- **Section Admin** — manages and views only employees within their own section.
- **Super Admin** — manages all sections, all employees, all system settings.

## 2. Employee Onboarding
- "Add New Employee" form with: full name, photo, employee ID, section, assigned shift, login credentials (auto-generate or set password).
- Prevent duplicate employee IDs.
- Section Admins can only add/manage employees in their own section; Super Admin can manage all.
- Support edit, deactivate, and reassign (section/shift change).

## 3. Shifts
- Support **6 configurable shifts per day**, each with: name, start time, end time, and a late-arrival grace period (e.g. 10–15 minutes).

## 4. Checkpoints (per shift, expandable)
Default sequence of checkpoints per shift, enforced in order:
1. Sign In (late-check applies)
2. Lunch Break — Out
3. Lunch Break — In
4. Tea Break — Out
5. Tea Break — In
6. Sign Out
7. Custom checkpoint (admin-defined)
8. Custom checkpoint (admin-defined)

Admins must be able to add more checkpoints beyond these 8. Employees cannot skip ahead (e.g. can't log "Lunch In" before "Lunch Out").

## 5. Photo Capture at Every Checkpoint
- At every checkpoint, capture a **1–2 minute photo/video clip** of the employee via device camera.
- Tag every capture with: employee name + photo, employee ID, section, shift, checkpoint name, GPS coordinates, and timestamp.
- If capture fails, block submission and prompt retry — don't allow a checkpoint to be logged without a photo.

## 6. Late-Arrival Detection
- Compare the Sign In checkpoint time against the shift's scheduled start time + grace period.
- Example: shift starts 10:30 AM, grace period 10 minutes. If actual Sign In is logged at 10:45 AM, mark the record **LATE**.
- Surface the checkpoint photo prominently wherever a LATE record appears on any admin dashboard.

## 7. GPS Geofencing
- Register each office location with a center coordinate and a **radius** (make this configurable; default 20–50 meters — a 1-meter radius is below real-world GPS accuracy and will constantly false-fail, so don't hardcode 1m).
- Validate device GPS against the geofence before allowing any checkpoint action.
- If outside the geofence: block the action and show a popup, e.g. "You are outside the office location."
- If the device re-enters the geofence: automatically re-enable checkpoint actions.
- Log every geofence rejection for audit purposes.

## 8. Admin Dashboards (Folder-Wise)
- **Section Admin:** view attendance in a folder structure — Section → Employee → Date → Checkpoint (photo, time, status).
- **Super Admin:** same folder-wise structure across ALL sections.
- Both dashboards must clearly flag LATE records and let the admin open the associated photo in one click.
- Every checkpoint's photo, timestamp, section, shift, and checkpoint name must be visible — nothing hidden.

## 9. Security
- **Login:** Employee ID / Admin ID + password.
- **3 wrong password attempts → account locked.** Locked accounts require Section Admin or Super Admin to unlock. Apply this uniformly to every role and every shift/section — one unified lockout rule.
- **Browser Back-button interception:** if a logged-in user presses Back, do not let them bypass the app. Re-lock the session and require password/ID re-entry to resume.
- Auto-expire idle sessions after a configurable timeout (default 15 minutes).
- Encrypt photo and location data in transit (TLS) and at rest.

## 10. Delivery Format
- Ship as an **installable PWA** (manifest + service worker, "Add to Home Screen").
- Must also work directly in a mobile browser without installation, as a fallback.

## 11. Non-Functional Requirements
- Checkpoint submission (photo + GPS + save) completes in under 5 seconds on standard 4G.
- Support 50–10,000+ employees without architecture changes.
- Checkpoint action completable in 3 taps or fewer from app open.
- Every geofence rejection, lockout event, and late flag is permanently logged and immutable.
- Get explicit consent from employees for photo and location capture at onboarding; make data retention configurable (default 180 days).

## 12. Data Model (minimum entities)
`Employee`, `Section`, `Shift`, `Checkpoint`, `AttendanceRecord` (photo, GPS, timestamp, status: ON_TIME/LATE/REJECTED), `GeofenceZone`, `LoginAttempt`, `AdminUser`.

## 13. Advanced Features (build if time allows, or stub for a later phase)
- Face-recognition auto-match against the employee's profile photo, with liveness detection to prevent photo-of-a-photo spoofing.
- Push notifications for checkpoint reminders and geofence-exit warnings.
- CSV/Excel export of filtered attendance records.
- Offline mode with a sync queue for spotty connectivity.
- Shift-swap request/approval workflow.
- Analytics dashboard: punctuality trends, section comparisons.
- Multi-language support.

## Deliverable
A complete, working, deployable codebase (frontend + backend + database schema) implementing all of the above — not a mockup. Include setup/run instructions.
