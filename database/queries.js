/**
 * AttendX Database Query Library
 * Consolidated raw SQL queries for all core operational flows.
 */

const QUERIES = {
  // ==========================================
  // 1. AUTHENTICATION & 3-STRIKE LOCKOUT
  // ==========================================
  FIND_ADMIN_BY_USERNAME: `
    SELECT id, username, password_hash, name, role, section_id, status, failed_attempts, locked_at
    FROM admin_users
    WHERE username = $1 OR username = ?;
  `,

  FIND_EMPLOYEE_BY_CODE: `
    SELECT e.id, e.employee_code, e.name, e.email, e.password_hash, e.photo_url,
           e.section_id, e.shift_id, e.status, e.failed_attempts, e.locked_at,
           s.name AS section_name, sh.name AS shift_name
    FROM employees e
    JOIN sections s ON e.section_id = s.id
    JOIN shifts sh ON e.shift_id = sh.id
    WHERE e.employee_code = $1 OR e.employee_code = ?;
  `,

  RECORD_LOGIN_ATTEMPT: `
    INSERT INTO login_attempts (id, identifier, user_type, ip_address, user_agent, success, failure_reason, created_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP);
  `,

  INCREMENT_FAILED_ATTEMPTS_EMPLOYEE: `
    UPDATE employees
    SET failed_attempts = failed_attempts + 1,
        status = CASE WHEN failed_attempts + 1 >= 3 THEN 'LOCKED' ELSE status END,
        locked_at = CASE WHEN failed_attempts + 1 >= 3 THEN CURRENT_TIMESTAMP ELSE locked_at END,
        lock_reason = CASE WHEN failed_attempts + 1 >= 3 THEN '3 consecutive failed password attempts' ELSE lock_reason END,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $1;
  `,

  RESET_FAILED_ATTEMPTS_EMPLOYEE: `
    UPDATE employees
    SET failed_attempts = 0, locked_at = NULL, lock_reason = NULL, updated_at = CURRENT_TIMESTAMP
    WHERE id = $1;
  `,

  UNLOCK_EMPLOYEE_ACCOUNT: `
    UPDATE employees
    SET status = 'ACTIVE', failed_attempts = 0, locked_at = NULL, lock_reason = NULL, updated_at = CURRENT_TIMESTAMP
    WHERE id = $1;
  `,

  LIST_LOCKED_ACCOUNTS: `
    SELECT e.id, e.employee_code, e.name, e.status, e.failed_attempts, e.locked_at,
           s.name AS section_name, 'EMPLOYEE' AS account_type
    FROM employees e
    JOIN sections s ON e.section_id = s.id
    WHERE e.status = 'LOCKED'
    UNION ALL
    SELECT a.id, a.username AS employee_code, a.name, a.status, a.failed_attempts, a.locked_at,
           'GLOBAL' AS section_name, 'ADMIN' AS account_type
    FROM admin_users a
    WHERE a.status = 'LOCKED'
    ORDER BY locked_at DESC;
  `,

  // ==========================================
  // 2. CHECKPOINT & SEQUENCE ENFORCEMENT
  // ==========================================
  GET_SHIFT_CHECKPOINTS: `
    SELECT id, shift_id, name, type, sequence_order, expected_time, is_mandatory
    FROM checkpoints
    WHERE shift_id = $1
    ORDER BY sequence_order ASC;
  `,

  GET_COMPLETED_TODAY_BY_EMPLOYEE: `
    SELECT ar.id, ar.checkpoint_id, ar.actual_time, ar.status, ar.photo_url,
           cp.name AS checkpoint_name, cp.sequence_order
    FROM attendance_records ar
    JOIN checkpoints cp ON ar.checkpoint_id = cp.id
    WHERE ar.employee_id = $1 AND ar.date = $2
    ORDER BY cp.sequence_order ASC;
  `,

  INSERT_ATTENDANCE_RECORD: `
    INSERT INTO attendance_records (
      id, employee_id, checkpoint_id, shift_id, date, actual_time,
      status, photo_url, gps_lat, gps_lng, gps_accuracy, geofence_status,
      distance_to_zone, liveness_score, notes, created_at
    ) VALUES (
      $1, $2, $3, $4, $5, CURRENT_TIMESTAMP,
      $6, $7, $8, $9, $10, $11,
      $12, $13, $14, CURRENT_TIMESTAMP
    );
  `,

  APPROVE_LATE_EXCEPTION: `
    UPDATE attendance_records
    SET status = 'ON_TIME', approved_exception = TRUE, approved_by = $2, notes = notes || ' [Exception Approved]'
    WHERE id = $1;
  `,

  // ==========================================
  // 3. GEOFENCING & PERIMETER CHECKS
  // ==========================================
  GET_ACTIVE_GEOFENCE_ZONES: `
    SELECT id, name, code, latitude, longitude, radius_meters, section_id
    FROM geofence_zones
    WHERE is_active = TRUE;
  `,

  RECORD_GEOFENCE_REJECTION: `
    INSERT INTO geofence_rejections (id, employee_id, latitude, longitude, checkpoint_attempted, distance_meters, breach_meters, created_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP);
  `,

  // ==========================================
  // 4. TELEMETRY OPS DASHBOARD AGGREGATES
  // ==========================================
  GET_DASHBOARD_AGGREGATES: `
    SELECT
      (SELECT COUNT(*) FROM employees WHERE status != 'INACTIVE') AS total_workforce,
      (SELECT COUNT(DISTINCT employee_id) FROM attendance_records WHERE date = $1 AND geofence_status = 'INSIDE') AS on_site_verified,
      (SELECT COUNT(*) FROM attendance_records WHERE date = $1 AND status = 'LATE') AS late_flagged,
      (SELECT COUNT(*) FROM attendance_records WHERE date = $1 AND status = 'BREAK') AS on_break,
      (SELECT COUNT(*) FROM attendance_records WHERE date = $1 AND (status = 'BREACH' OR geofence_status = 'OUTSIDE')) AS geofence_breach,
      (SELECT COUNT(*) FROM employees WHERE status = 'LOCKED') + (SELECT COUNT(*) FROM admin_users WHERE status = 'LOCKED') AS auth_lockouts;
  `,

  // ==========================================
  // 5. FOLDER-WISE HIERARCHICAL VIEW
  // ==========================================
  GET_FOLDER_VIEW_RECORDS: `
    SELECT s.id AS section_id, s.name AS section_name,
           e.id AS employee_id, e.employee_code, e.name AS employee_name,
           ar.date AS work_date,
           ar.id AS record_id, ar.status, ar.actual_time, ar.photo_url, ar.gps_lat, ar.gps_lng, ar.gps_accuracy,
           cp.name AS checkpoint_name, cp.sequence_order
    FROM sections s
    JOIN employees e ON e.section_id = s.id
    LEFT JOIN attendance_records ar ON ar.employee_id = e.id AND ar.date = $1
    LEFT JOIN checkpoints cp ON ar.checkpoint_id = cp.id
    WHERE ($2::text IS NULL OR s.id = $2)
    ORDER BY s.name ASC, e.name ASC, cp.sequence_order ASC;
  `,

  // ==========================================
  // 6. AUDIT TRAIL
  // ==========================================
  INSERT_AUDIT_LOG: `
    INSERT INTO audit_log (id, action, entity_type, entity_id, actor_id, actor_role, details, ip_address, created_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP);
  `,

  GET_RECENT_AUDIT_LOGS: `
    SELECT id, action, entity_type, entity_id, actor_id, actor_role, details, ip_address, created_at
    FROM audit_log
    ORDER BY created_at DESC
    LIMIT $1;
  `
};

module.exports = QUERIES;
