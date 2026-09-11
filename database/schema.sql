-- =====================================================================
-- AttendX — Production Database Schema (DDL)
-- PostgreSQL / ANSI SQL Compatible
-- =====================================================================

-- Clean slate (if recreating)
-- DROP TABLE IF EXISTS audit_log CASCADE;
-- DROP TABLE IF EXISTS geofence_rejections CASCADE;
-- DROP TABLE IF EXISTS login_attempts CASCADE;
-- DROP TABLE IF EXISTS attendance_records CASCADE;
-- DROP TABLE IF EXISTS geofence_zones CASCADE;
-- DROP TABLE IF EXISTS checkpoints CASCADE;
-- DROP TABLE IF EXISTS employees CASCADE;
-- DROP TABLE IF EXISTS admin_users CASCADE;
-- DROP TABLE IF EXISTS shifts CASCADE;
-- DROP TABLE IF EXISTS sections CASCADE;
-- DROP TABLE IF EXISTS settings CASCADE;

-- 1. SECTIONS TABLE
CREATE TABLE IF NOT EXISTS sections (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. SHIFTS TABLE (Supports 6 Daily Configurable Shifts)
CREATE TABLE IF NOT EXISTS shifts (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    start_time VARCHAR(10) NOT NULL,     -- e.g. "06:00", "10:30" (24-hr format)
    end_time VARCHAR(10) NOT NULL,       -- e.g. "14:30", "19:00"
    grace_period_minutes INT DEFAULT 15, -- Grace threshold before late flag
    section_id VARCHAR(36) REFERENCES sections(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. CHECKPOINTS TABLE (8 Sequential Checkpoints per Shift)
CREATE TABLE IF NOT EXISTS checkpoints (
    id VARCHAR(36) PRIMARY KEY,
    shift_id VARCHAR(36) NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,          -- e.g. "Sign In", "Lunch Out", etc.
    type VARCHAR(50) DEFAULT 'CUSTOM',   -- SIGN_IN, LUNCH_OUT, LUNCH_IN, TEA_OUT, TEA_IN, SIGN_OUT, CUSTOM
    sequence_order INT NOT NULL,         -- 1, 2, 3, 4, 5, 6, 7, 8
    expected_time VARCHAR(10),           -- e.g. "10:30"
    is_mandatory BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_shift_sequence UNIQUE (shift_id, sequence_order)
);

-- 4. ADMIN USERS TABLE (Super Admin & Section Admin)
CREATE TABLE IF NOT EXISTS admin_users (
    id VARCHAR(36) PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(150) NOT NULL,
    role VARCHAR(50) DEFAULT 'SECTION_ADMIN' CHECK(role IN ('SUPER_ADMIN', 'SECTION_ADMIN')),
    status VARCHAR(50) DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'LOCKED', 'INACTIVE')),
    section_id VARCHAR(36) REFERENCES sections(id) ON DELETE SET NULL,
    failed_attempts INT DEFAULT 0,
    locked_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. EMPLOYEES TABLE
CREATE TABLE IF NOT EXISTS employees (
    id VARCHAR(36) PRIMARY KEY,
    employee_code VARCHAR(50) NOT NULL UNIQUE,  -- e.g. "EMP-9000"
    name VARCHAR(150) NOT NULL,
    email VARCHAR(150) UNIQUE,
    phone VARCHAR(50),
    password_hash VARCHAR(255) NOT NULL,
    photo_url TEXT,
    section_id VARCHAR(36) NOT NULL REFERENCES sections(id),
    shift_id VARCHAR(36) NOT NULL REFERENCES shifts(id),
    status VARCHAR(50) DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'LOCKED', 'INACTIVE')),
    failed_attempts INT DEFAULT 0,
    locked_at TIMESTAMP WITH TIME ZONE,
    lock_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. GEOFENCE ZONES TABLE
CREATE TABLE IF NOT EXISTS geofence_zones (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,                 -- e.g. "HQ-Alpha Primary Campus"
    code VARCHAR(50) NOT NULL UNIQUE,           -- e.g. "GEO-HQ-ALPHA"
    latitude DOUBLE PRECISION NOT NULL,         -- e.g. 37.7749
    longitude DOUBLE PRECISION NOT NULL,        -- e.g. -122.4194
    radius_meters DOUBLE PRECISION DEFAULT 50.0,-- Real-world GPS safe radius (20-50m)
    is_active BOOLEAN DEFAULT TRUE,
    section_id VARCHAR(36) REFERENCES sections(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. ATTENDANCE RECORDS TABLE (Core Telemetry)
CREATE TABLE IF NOT EXISTS attendance_records (
    id VARCHAR(36) PRIMARY KEY,
    employee_id VARCHAR(36) NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    checkpoint_id VARCHAR(36) NOT NULL REFERENCES checkpoints(id) ON DELETE CASCADE,
    shift_id VARCHAR(36) NOT NULL REFERENCES shifts(id),
    date VARCHAR(10) NOT NULL,                  -- "YYYY-MM-DD"
    actual_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'ON_TIME' CHECK(status IN ('ON_TIME', 'LATE', 'BREACH', 'BREAK')),
    photo_url TEXT NOT NULL,                    -- Photo-verification mandatory
    gps_lat DOUBLE PRECISION NOT NULL,
    gps_lng DOUBLE PRECISION NOT NULL,
    gps_accuracy DOUBLE PRECISION NOT NULL,     -- GPS accuracy in meters (e.g. 1.2m)
    geofence_status VARCHAR(20) DEFAULT 'INSIDE' CHECK(geofence_status IN ('INSIDE', 'OUTSIDE')),
    distance_to_zone DOUBLE PRECISION DEFAULT 0.0,
    liveness_score DOUBLE PRECISION DEFAULT 98.4,
    notes TEXT,
    approved_exception BOOLEAN DEFAULT FALSE,
    approved_by VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. LOGIN ATTEMPTS TABLE (Enforces 3-Strike Lockout Policy)
CREATE TABLE IF NOT EXISTS login_attempts (
    id VARCHAR(36) PRIMARY KEY,
    identifier VARCHAR(100) NOT NULL,           -- Username or employeeCode
    user_type VARCHAR(50) NOT NULL,             -- "ADMIN" or "EMPLOYEE"
    ip_address VARCHAR(50),
    user_agent TEXT,
    success BOOLEAN DEFAULT FALSE,
    failure_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. GEOFENCE REJECTIONS TABLE (Audit for Perimeter Violations)
CREATE TABLE IF NOT EXISTS geofence_rejections (
    id VARCHAR(36) PRIMARY KEY,
    employee_id VARCHAR(36) NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    checkpoint_attempted VARCHAR(100),
    distance_meters DOUBLE PRECISION,
    breach_meters DOUBLE PRECISION,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. AUDIT LOG TABLE (Permanent System Telemetry)
CREATE TABLE IF NOT EXISTS audit_log (
    id VARCHAR(36) PRIMARY KEY,
    action VARCHAR(100) NOT NULL,               -- LOGIN, CHECKPOINT_SUBMIT, ACCOUNT_LOCKED, EXCEPTION_APPROVED
    entity_type VARCHAR(50) NOT NULL,           -- Employee, AdminUser, AttendanceRecord
    entity_id VARCHAR(36),
    actor_id VARCHAR(36),
    actor_role VARCHAR(50),
    details JSON,
    ip_address VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 11. SYSTEM SETTINGS TABLE
CREATE TABLE IF NOT EXISTS settings (
    key VARCHAR(100) PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================================
-- PERFORMANCE & FILTERING INDEXES
-- =====================================================================
CREATE INDEX IF NOT EXISTS idx_att_emp_date ON attendance_records(employee_id, date);
CREATE INDEX IF NOT EXISTS idx_att_shift_date ON attendance_records(shift_id, date);
CREATE INDEX IF NOT EXISTS idx_att_status ON attendance_records(status);
CREATE INDEX IF NOT EXISTS idx_att_time ON attendance_records(actual_time DESC);
CREATE INDEX IF NOT EXISTS idx_login_identifier ON login_attempts(identifier, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_log(action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_emp_section ON employees(section_id);
CREATE INDEX IF NOT EXISTS idx_emp_shift ON employees(shift_id);
CREATE INDEX IF NOT EXISTS idx_emp_status ON employees(status);
CREATE INDEX IF NOT EXISTS idx_checkpoints_seq ON checkpoints(shift_id, sequence_order);
