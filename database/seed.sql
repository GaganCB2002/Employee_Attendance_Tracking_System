-- =====================================================================
-- AttendX — Production Seed Data
-- =====================================================================

-- 1. SECTIONS SEED
INSERT INTO sections (id, name, code, description) VALUES
('sec-01', 'Sec-A / Flow-1', 'SEC-A-F1', 'Avionics & Flight Hardware'),
('sec-02', 'Sec-A / Flow-2', 'SEC-A-F2', 'Propulsion & Cryo Systems'),
('sec-03', 'Sec-B / Flow-3', 'SEC-B-F3', 'Telemetry & Signal Processing'),
('sec-04', 'Sec-B / Flow-4', 'SEC-B-F4', 'Composite Structures & Airframe'),
('sec-05', 'Sec-C / Flow-5', 'SEC-C-F5', 'Guidance & Navigation Systems'),
('sec-06', 'Sec-C / Flow-6', 'SEC-C-F6', 'Mission Command Operations')
ON CONFLICT (code) DO NOTHING;

-- 2. SHIFTS SEED (6 Configurable Shifts)
INSERT INTO shifts (id, name, start_time, end_time, grace_period_minutes) VALUES
('sh-01', 'Shift-01 (06:00-14:30)', '06:00', '14:30', 15),
('sh-02', 'Shift-02 (08:00-16:30)', '08:00', '16:30', 15),
('sh-03', 'Shift-03 (10:30-19:00)', '10:30', '19:00', 15),
('sh-04', 'Shift-04 (14:00-22:30)', '14:00', '22:30', 15),
('sh-05', 'Shift-05 (18:00-02:30)', '18:00', '02:30', 15),
('sh-06', 'Shift-06 (22:00-06:30)', '22:00', '06:30', 15)
ON CONFLICT (id) DO NOTHING;

-- 3. CHECKPOINTS SEED (8 Checkpoints per Shift in Strict Sequence)
-- Checkpoints for Shift 1
INSERT INTO checkpoints (id, shift_id, name, type, sequence_order, expected_time, is_mandatory) VALUES
('cp-01-1', 'sh-01', 'Sign In', 'SIGN_IN', 1, '06:00', TRUE),
('cp-01-2', 'sh-01', 'Lunch Break — Out', 'LUNCH_OUT', 2, '10:00', TRUE),
('cp-01-3', 'sh-01', 'Lunch Break — In', 'LUNCH_IN', 3, '10:45', TRUE),
('cp-01-4', 'sh-01', 'Tea Break — Out', 'TEA_OUT', 4, '12:30', TRUE),
('cp-01-5', 'sh-01', 'Tea Break — In', 'TEA_IN', 5, '12:45', TRUE),
('cp-01-6', 'sh-01', 'Sign Out', 'SIGN_OUT', 6, '14:30', TRUE),
('cp-01-7', 'sh-01', 'Flight Handover Briefing', 'CUSTOM', 7, '14:30', FALSE),
('cp-01-8', 'sh-01', 'Telemetry Log Sync', 'CUSTOM', 8, '14:30', FALSE)
ON CONFLICT (shift_id, sequence_order) DO NOTHING;

-- Checkpoints for Shift 2
INSERT INTO checkpoints (id, shift_id, name, type, sequence_order, expected_time, is_mandatory) VALUES
('cp-02-1', 'sh-02', 'Sign In', 'SIGN_IN', 1, '08:00', TRUE),
('cp-02-2', 'sh-02', 'Lunch Break — Out', 'LUNCH_OUT', 2, '12:00', TRUE),
('cp-02-3', 'sh-02', 'Lunch Break — In', 'LUNCH_IN', 3, '12:45', TRUE),
('cp-02-4', 'sh-02', 'Tea Break — Out', 'TEA_OUT', 4, '14:30', TRUE),
('cp-02-5', 'sh-02', 'Tea Break — In', 'TEA_IN', 5, '14:45', TRUE),
('cp-02-6', 'sh-02', 'Sign Out', 'SIGN_OUT', 6, '16:30', TRUE),
('cp-02-7', 'sh-02', 'Shift Handover Briefing', 'CUSTOM', 7, '16:30', FALSE),
('cp-02-8', 'sh-02', 'Perimeter Sweep Log', 'CUSTOM', 8, '16:30', FALSE)
ON CONFLICT (shift_id, sequence_order) DO NOTHING;

-- Checkpoints for Shift 3
INSERT INTO checkpoints (id, shift_id, name, type, sequence_order, expected_time, is_mandatory) VALUES
('cp-03-1', 'sh-03', 'Sign In', 'SIGN_IN', 1, '10:30', TRUE),
('cp-03-2', 'sh-03', 'Lunch Break — Out', 'LUNCH_OUT', 2, '13:30', TRUE),
('cp-03-3', 'sh-03', 'Lunch Break — In', 'LUNCH_IN', 3, '14:15', TRUE),
('cp-03-4', 'sh-03', 'Tea Break — Out', 'TEA_OUT', 4, '16:30', TRUE),
('cp-03-5', 'sh-03', 'Tea Break — In', 'TEA_IN', 5, '16:45', TRUE),
('cp-03-6', 'sh-03', 'Sign Out', 'SIGN_OUT', 6, '19:00', TRUE),
('cp-03-7', 'sh-03', 'Shift Handover Briefing', 'CUSTOM', 7, '19:00', FALSE),
('cp-03-8', 'sh-03', 'Avionics Calibration Audit', 'CUSTOM', 8, '19:00', FALSE)
ON CONFLICT (shift_id, sequence_order) DO NOTHING;

-- 4. GEOFENCE ZONES SEED
INSERT INTO geofence_zones (id, name, code, latitude, longitude, radius_meters, is_active) VALUES
('geo-01', 'HQ-Alpha Primary Campus', 'GEO-HQ-ALPHA', 37.7749, -122.4194, 50.0, TRUE),
('geo-02', 'Sec-B Test Substation & Gate S4', 'GEO-SEC-B-S4', 37.7758, -122.4182, 40.0, TRUE)
ON CONFLICT (code) DO NOTHING;

-- 5. ADMIN ACCOUNTS SEED (bcrypt for admin123 & section123)
-- admin123: $2a$10$wT33ZzKiqdCjBv8Y1Wl02.WdZp5jXkR/lPqgC8W18uU5mX2jQoQv2 (or standard hash)
INSERT INTO admin_users (id, username, password_hash, name, role, section_id, status) VALUES
('adm-01', 'superadmin', '$2b$10$E8r0pCq7p9jW03mG.P0kF.j8vV11iZqG9r4pBv6e1wK7uX0mY8n9e', 'Commander Ops (Super Admin)', 'SUPER_ADMIN', NULL, 'ACTIVE'),
('adm-02', 'engadmin', '$2b$10$E8r0pCq7p9jW03mG.P0kF.j8vV11iZqG9r4pBv6e1wK7uX0mY8n9e', 'Major Reynolds (Avionics Admin)', 'SECTION_ADMIN', 'sec-01', 'ACTIVE')
ON CONFLICT (username) DO NOTHING;

-- 6. EMPLOYEES SEED
INSERT INTO employees (id, employee_code, name, email, phone, password_hash, photo_url, section_id, shift_id, status, failed_attempts) VALUES
('emp-01', 'EMP-9000', 'Marcus Chen', 'marcus.chen@attendx.aero', '+1-555-0110', '$2b$10$E8r0pCq7p9jW03mG.P0kF.j8vV11iZqG9r4pBv6e1wK7uX0mY8n9e', '/uploads/profiles/emp-1.jpg', 'sec-01', 'sh-01', 'ACTIVE', 0),
('emp-02', 'EMP-9137', 'Elena Rostova', 'elena.rostova@attendx.aero', '+1-555-0111', '$2b$10$E8r0pCq7p9jW03mG.P0kF.j8vV11iZqG9r4pBv6e1wK7uX0mY8n9e', '/uploads/profiles/emp-2.jpg', 'sec-02', 'sh-02', 'ACTIVE', 0),
('emp-03', 'EMP-9274', 'Tariq Mansour', 'tariq.mansour@attendx.aero', '+1-555-0112', '$2b$10$E8r0pCq7p9jW03mG.P0kF.j8vV11iZqG9r4pBv6e1wK7uX0mY8n9e', '/uploads/profiles/emp-3.jpg', 'sec-03', 'sh-03', 'ACTIVE', 0),
('emp-04', 'EMP-9411', 'Devina Patel', 'devina.patel@attendx.aero', '+1-555-0113', '$2b$10$E8r0pCq7p9jW03mG.P0kF.j8vV11iZqG9r4pBv6e1wK7uX0mY8n9e', '/uploads/profiles/emp-4.jpg', 'sec-04', 'sh-01', 'ACTIVE', 0),
('emp-05', 'EMP-9548', 'Johnathan Vance', 'johnathan.vance@attendx.aero', '+1-555-0114', '$2b$10$E8r0pCq7p9jW03mG.P0kF.j8vV11iZqG9r4pBv6e1wK7uX0mY8n9e', '/uploads/profiles/emp-5.jpg', 'sec-01', 'sh-02', 'ACTIVE', 0),
('emp-13', 'EMP-10644', 'Owen Brennan', 'owen.brennan@attendx.aero', '+1-555-0122', '$2b$10$E8r0pCq7p9jW03mG.P0kF.j8vV11iZqG9r4pBv6e1wK7uX0mY8n9e', '/uploads/profiles/emp-13.jpg', 'sec-01', 'sh-03', 'LOCKED', 3)
ON CONFLICT (employee_code) DO NOTHING;

-- 7. SYSTEM SETTINGS SEED
INSERT INTO settings (key, value, description) VALUES
('session_timeout_minutes', '15', 'Automatic logout timeout for idle sessions'),
('max_login_attempts', '3', '3-strike consecutive failure lockout threshold'),
('default_geofence_radius', '50', 'Default perimeter radius in meters'),
('late_grace_period_minutes', '15', 'Grace threshold after shift start time before LATE flag'),
('data_retention_days', '180', 'Audit and photo retention period in days')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
