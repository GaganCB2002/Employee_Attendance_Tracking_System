/**
 * AttendX Automated Security Hardening Test Suite
 * Tests the 4 required security deliverables:
 * 1. lockout-after-3-attempts
 * 2. rejected-request-outside-geofence
 * 3. rejected-oversized-upload
 * 4. rejected-malformed-input
 */

const assert = require('assert');
const prisma = require('../src/config/db');

const API_BASE = 'http://localhost:4000/api';

async function runSecurityTests() {
  console.log('====================================================');
  console.log(' ATTENDX AUTOMATED SECURITY TEST SUITE STARTING');
  console.log('====================================================\n');

  let passedCount = 0;
  let failedCount = 0;

  async function test(name, fn) {
    try {
      process.stdout.write(`TEST: ${name} ... `);
      await fn();
      console.log('PASSED [OK]');
      passedCount++;
    } catch (err) {
      console.log('FAILED [X]');
      console.error('   -> Error:', err.message);
      failedCount++;
    }
  }

  async function fetchApi(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      'x-attendx-test-suite': 'security-test',
      ...(options.headers || {}),
    };
    return fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });
  }

  // --- Ensure a test employee exists and is unlocked before tests ---
  const TEST_EMP_CODE = 'EMP-SEC-TEST';
  const TEST_EMP_PASS = 'TestPass123!';
  const bcrypt = require('bcryptjs');
  const passwordHash = await bcrypt.hash(TEST_EMP_PASS, 10);

  // Get first available section & shift
  const section = await prisma.section.findFirst();
  const shift = await prisma.shift.findFirst({
    include: { checkpoints: { orderBy: { sequenceOrder: 'asc' } } },
  });

  if (!section || !shift) {
    throw new Error('Database must have at least one section and shift seeded to run tests.');
  }

  // Upsert test employee
  await prisma.employee.upsert({
    where: { employeeCode: TEST_EMP_CODE },
    update: {
      status: 'ACTIVE',
      failedAttempts: 0,
      lockedAt: null,
      lockReason: null,
      passwordHash,
    },
    create: {
      employeeCode: TEST_EMP_CODE,
      name: 'Security Test Agent',
      sectionId: section.id,
      shiftId: shift.id,
      passwordHash,
      status: 'ACTIVE',
      failedAttempts: 0,
    },
  });

  // --------------------------------------------------------------------------
  // TEST 1: lockout-after-3-attempts
  // --------------------------------------------------------------------------
  await test('lockout-after-3-attempts (Enforces 3-strike policy server-side)', async () => {
    // Reset account state first
    await prisma.employee.update({
      where: { employeeCode: TEST_EMP_CODE },
      data: { status: 'ACTIVE', failedAttempts: 0, lockedAt: null },
    });

    // Attempt 1: Wrong password
    const res1 = await fetchApi('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier: TEST_EMP_CODE, password: 'WrongPassword1!' }),
    });
    const data1 = await res1.json();
    assert.strictEqual(res1.status, 401, 'Attempt 1 should return 401 Unauthorized');
    assert.strictEqual(data1.isLocked, false, 'Attempt 1 should not be locked');
    assert.strictEqual(data1.remainingAttempts, 2, 'Attempt 1 should leave 2 attempts remaining');

    // Attempt 2: Wrong password
    const res2 = await fetchApi('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier: TEST_EMP_CODE, password: 'WrongPassword2!' }),
    });
    const data2 = await res2.json();
    assert.strictEqual(res2.status, 401, 'Attempt 2 should return 401 Unauthorized');
    assert.strictEqual(data2.isLocked, false, 'Attempt 2 should not be locked');
    assert.strictEqual(data2.remainingAttempts, 1, 'Attempt 2 should leave 1 attempt remaining');

    // Attempt 3: Wrong password -> Trigger 3-strike lockout!
    const res3 = await fetchApi('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier: TEST_EMP_CODE, password: 'WrongPassword3!' }),
    });
    const data3 = await res3.json();
    assert.strictEqual(res3.status, 401, 'Attempt 3 should return 401');
    assert.strictEqual(data3.isLocked, true, 'Attempt 3 should set isLocked to true');

    // Verify database record has been locked
    const empInDb = await prisma.employee.findUnique({ where: { employeeCode: TEST_EMP_CODE } });
    assert.strictEqual(empInDb.status, 'LOCKED', 'Database employee status must be LOCKED');
    assert.strictEqual(empInDb.failedAttempts, 3, 'Database failedAttempts must be 3');

    // Attempt 4: Even with CORRECT password, server must reject because account is LOCKED!
    const res4 = await fetchApi('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier: TEST_EMP_CODE, password: TEST_EMP_PASS }),
    });
    const data4 = await res4.json();
    assert.strictEqual(res4.status, 403, 'Attempt 4 with correct password on locked account must return 403 Forbidden');
    assert.strictEqual(data4.isLocked, true, 'Response must identify account as locked');

    // Clean up / unlock test account
    await prisma.employee.update({
      where: { employeeCode: TEST_EMP_CODE },
      data: { status: 'ACTIVE', failedAttempts: 0, lockedAt: null },
    });
  });

  // --------------------------------------------------------------------------
  // Obtain valid token for authenticated checkpoint & geofence tests
  // --------------------------------------------------------------------------
  const loginRes = await fetchApi('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier: TEST_EMP_CODE, password: TEST_EMP_PASS }),
  });
  const loginData = await loginRes.json();
  assert.strictEqual(loginRes.status, 200, 'Test employee login must succeed');
  const validToken = loginData.token;

  // --------------------------------------------------------------------------
  // TEST 2: rejected-request-outside-geofence
  // --------------------------------------------------------------------------
  await test('rejected-request-outside-geofence (Coordinates outside perimeter rejected)', async () => {
    // Valid checkpoint ID from assigned shift
    const firstCheckpoint = shift.checkpoints[0];

    // Dummy coordinate located in the Pacific Ocean (far outside any section geofence)
    const breachPayload = {
      checkpointId: firstCheckpoint.id,
      latitude: 0.0000,
      longitude: 0.0000,
      accuracy: 5.0,
      photoBase64: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP...',
    };

    const res = await fetchApi('/attendance/checkpoint', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${validToken}`,
      },
      body: JSON.stringify(breachPayload),
    });

    const data = await res.json();
    assert.strictEqual(res.status, 403, 'Request outside geofence must return HTTP 403 Forbidden');
    assert.strictEqual(data.success, false, 'Success flag must be false');
    assert.ok(
      data.error.includes('Geofence breach') || data.breachMeters !== undefined,
      'Response must explain geofence perimeter breach'
    );
  });

  // --------------------------------------------------------------------------
  // TEST 3: rejected-oversized-upload
  // --------------------------------------------------------------------------
  await test('rejected-oversized-upload (Payloads exceeding 2MB body limit rejected)', async () => {
    // Construct a payload string > 2.5 MB
    const largeString = 'A'.repeat(2.5 * 1024 * 1024);
    const oversizedPayload = {
      identifier: TEST_EMP_CODE,
      data: largeString,
    };

    const res = await fetchApi('/auth/login', {
      method: 'POST',
      body: JSON.stringify(oversizedPayload),
    });

    assert.strictEqual(
      res.status,
      413,
      `Oversized payload should be rejected with HTTP 413 Payload Too Large (Got: ${res.status})`
    );

    const data = await res.json();
    assert.strictEqual(data.success, false, 'Success must be false');
    assert.ok(
      data.error.includes('allowable security limits') || data.error.includes('too large'),
      'Error message must indicate payload size violation'
    );
  });

  // --------------------------------------------------------------------------
  // TEST 4: rejected-malformed-input
  // --------------------------------------------------------------------------
  await test('rejected-malformed-input (Strict schema validation rejects invalid data)', async () => {
    // 4a. Out of range latitude (lat = 999.0 > 90)
    const malformedCoordsPayload = {
      checkpointId: shift.checkpoints[0].id,
      latitude: 999.0, // Invalid coordinate
      longitude: 77.5946,
    };

    const res1 = await fetchApi('/attendance/checkpoint', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${validToken}`,
      },
      body: JSON.stringify(malformedCoordsPayload),
    });

    const data1 = await res1.json();
    assert.strictEqual(res1.status, 400, 'Out-of-range GPS coordinates must return 400 Bad Request');
    assert.strictEqual(data1.success, false);
    assert.ok(
      JSON.stringify(data1).includes('out of valid GPS range'),
      'Details must mention coordinate validation failure'
    );

    // 4b. Missing required fields in checkpoint schema (checkpointId missing)
    const missingFieldPayload = {
      latitude: 12.9716,
      longitude: 77.5946,
      // checkpointId missing
    };

    const res2 = await fetchApi('/attendance/checkpoint', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${validToken}`,
      },
      body: JSON.stringify(missingFieldPayload),
    });

    const data2 = await res2.json();
    assert.strictEqual(res2.status, 400, 'Missing required checkpointId field must return 400 Bad Request');
    assert.strictEqual(data2.success, false);
    assert.ok(
      JSON.stringify(data2).includes('is required'),
      'Details must mention required field'
    );
  });

  // --------------------------------------------------------------------------
  // SUMMARY
  // --------------------------------------------------------------------------
  console.log('\n====================================================');
  console.log(` RESULTS: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log('====================================================');

  if (failedCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runSecurityTests().catch((err) => {
  console.error('CRITICAL TEST RUNNER EXCEPTION:', err);
  process.exit(1);
});
