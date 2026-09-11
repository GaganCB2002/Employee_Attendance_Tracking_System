# AttendX — Security & Backend Middleware Specification (Hardened Architecture)

> **Zero-Trust Baseline**: No unauthenticated, injected, spoofed, or brute-forced request reaches business logic. Every security layer is enforced server-side.

---

## 1. Middleware Architecture & Execution Pipeline

All HTTP requests pass through the hardened middleware pipeline in the exact sequential order below:

```
Incoming Request
      │
      ▼
1. security.middleware.js     (Helmet suite, HSTS, CSP, Permissions-Policy, X-Frame-Options: DENY)
      │
      ▼
2. cors.middleware.js         (Strict origin allowlist; rejects arbitrary origins, no wildcard '*')
      │
      ▼
3. rateLimiter.middleware.js  (Global IP throttle: 100 req/min; Login: 5 req/min; Checkpoint: 10 req/min)
      │
      ▼
4. Body Parser & Cookies      (express.json with strict 2MB cap; cookieParser)
      │
      ▼
5. sanitize.middleware.js     (Recursive XSS tag stripping, NoSQL '$' key rejection, SQLi pattern neutralizer)
      │
      ▼
6. csrfMiddleware.js          (Double-submit cookie CSRF validation for cookie sessions; Bearer exempt)
      │
      ▼
7. validate.middleware.js     (Strict schema allowlist validation per route before controller)
      │
      ▼
8. authMiddleware.js          (JWT verification, stale token detection, blacklist check, 15m idle check)
      │
      ▼
9. roleMiddleware.js          (Role verification & Section Admin scope isolation)
      │
      ▼
10. lockoutMiddleware.js      (3-strike account lock check & failed attempt enforcement)
      │
      ▼
11. deviceCheck.middleware.js (Checkpoint routes: mock GPS detection, GPS freshness, 5s replay delay, SHA-256 photo hash)
      │
      ▼
12. Controller Execution      (Business logic execution with parameterized Prisma ORM queries)
      │
      ▼
13. auditLogger.middleware.js (Immutable append-only SHA-256 block-chained audit ledger entry)
      │
      ▼
14. errorHandler.middleware.js (Centralized sanitization: incident IDs 'INC-XXXX', zero stack trace leakage)
```

---

## 2. Authentication & Session Hardening

| Feature | Specification | Implementation Detail |
|---|---|---|
| **Password Storage** | `bcrypt` (cost factor 10-12) | Plaintext or reversible passwords are strictly prohibited. Password hashes are compared using constant-time algorithms. |
| **Access Tokens** | Short-lived JWT (15 min) | Signed with high-entropy `JWT_SECRET`. Contains unique token ID (`jti`) and user metadata. |
| **Refresh Tokens** | Single-use rotating tokens | Stored as `httpOnly`, `Secure` (in production), `SameSite=Strict` cookie (`attendx_refresh`). Valid for 7 days. |
| **Replay & Theft Detection** | Immediate session revocation | If a previously used refresh token is presented, the system flags theft and immediately revokes all active sessions for that user. |
| **3-Strike Lockout** | Server-side account locking | After 3 consecutive failed login attempts, the account is marked `LOCKED`. Subsequent logins are rejected with HTTP 403 even if the correct password is submitted. |
| **Server-Side Token Revocation**| Explicit logout / lockout | Stored in an in-memory / persistent revocation store. If a user logs out or is locked out, the server rejects any previously issued access token. Client-side gating alone is never trusted. |
| **Idle Timeout** | 15-minute inactivity policy | Monitored per user activity timestamp. Inactivity > 15 minutes terminates the session and requires re-authentication. |
| **Brute-Force Rate Limiting** | 5 attempts / IP / minute | Applied to `/api/auth/login` to prevent password spraying across multiple accounts. |

---

## 3. Input Validation & Injection Prevention

- **Schema Allowlists (`validate.middleware.js`)**: All request parameters, queries, and bodies are validated against strict type, range, and length schemas. Any out-of-range coordinate (e.g. Latitude > 90), non-string passwords, or missing required fields are rejected with HTTP 400 Bad Request before reaching controllers.
- **ORM Parameterization**: Database queries exclusively use Prisma ORM parameterized queries (`prisma.findUnique`, `prisma.create`, `prisma.update`). Raw SQL string concatenation is prohibited.
- **Sanitization (`sanitize.middleware.js`)**: Recursively sanitizes user inputs by stripping `<script>` and HTML tags, rejecting keys starting with `$` (NoSQL injection), and normalizing dangerous SQL comments (`--`, `/*`). Checkpoint base64 image URIs are safely preserved.
- **Payload Limits**: Global JSON body limit is locked at **2MB**. File uploads (photos/clips) are handled via Multer with a dedicated **25MB** limit and file-type sniffing.

---

## 4. Transport & Header Security

- **Content-Security-Policy (CSP)**: Locked to `'self'`, trusted font providers (`fonts.googleapis.com`), and self/blob image sources. Inlined script execution is blocked.
- **Clickjacking Defense**: `X-Frame-Options: DENY` and `frame-src: 'none'` prevent framing of login or checkpoint pages.
- **MIME Sniffing Prevention**: `X-Content-Type-Options: nosniff`.
- **Referrer Policy**: `Referrer-Policy: no-referrer`.
- **Permissions-Policy**: Restricted to `camera=(self)` and `geolocation=(self)`. All other capabilities (`microphone`, `usb`, `payment`, sensors) are disabled.
- **HSTS**: `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload` enforced in production with automatic HTTP-to-HTTPS redirection.
- **Strict CORS**: Explicit allowlist (`http://localhost:5173`, `http://127.0.0.1:5173`, production domains). Wildcard `*` and origin reflection are prohibited.

---

## 5. Geofencing & Anti-Spoofing Integrity

- **Mock Location Detection (`deviceCheck.middleware.js`)**: Detects Android Fused Location `isMock` flags and spoofing headers (`x-device-mock-check: true`). Rejects spoofed coordinates with HTTP 403 Forbidden.
- **GPS Timestamp Freshness**: Rejects GPS payloads whose client timestamp deviates by more than **120 seconds** from server time, mitigating replay attacks.
- **Rapid Replay Suppression**: Enforces a minimum **5-second cooldown** between checkpoint submissions per employee to prevent script automation.
- **Tamper-Evident SHA-256 Photo Hashing**: Every uploaded checkpoint photo/clip has a cryptographic SHA-256 digest computed at ingestion and bound to the attendance record and chained audit trail.
- **Perimeter Geofencing**: Computes Haversine distance between device coordinates and authorized perimeter. Out-of-bounds requests are rejected with HTTP 403 and logged as security breach alerts.

---

## 6. Cryptographic Chained Audit Ledger

- **Immutable Chaining (`auditLogger.middleware.js`)**: Every state-mutating action, authentication attempt, lockout, unlock, and checkpoint submission is hashed and chained to the previous record's hash (`currentBlockHash = SHA256(previousBlockHash + serializedPayload)`).
- **Tamper Detection**: Any modification to a historical database row breaks the hash chain, rendering tampering immediately detectable on audit verification.

---

## 7. Centralized Error Handling

- **Zero Information Leakage (`errorHandler.middleware.js`)**: Clients receive sanitized errors with a traceable incident ID (e.g. `INC-A3F9C12E`).
- **Internal Logging**: Full stack traces, database codes, and system paths are logged exclusively server-side and never returned to the client browser.

---

## 8. OWASP Top 10 Mitigation Matrix

| OWASP Risk | Mitigation in AttendX |
|---|---|
| **A01: Broken Access Control** | `roleMiddleware.js` verifies permissions and enforces Section Admin scope filtering at the database query layer. |
| **A02: Cryptographic Failures** | Bcrypt hashing, TLS enforcement, SHA-256 photo digests, and cryptographic chained ledger. |
| **A03: Injection** | Strict schema validation (`validate.middleware.js`), input sanitization (`sanitize.middleware.js`), and Prisma ORM parameterized queries. |
| **A04: Insecure Design** | 3-strike lockout policy, short-lived 15m JWTs, rotating single-use refresh tokens with reuse theft detection. |
| **A05: Security Misconfiguration** | Helmet suite, strict CSP, `X-Frame-Options: DENY`, strict CORS allowlist (no wildcards). |
| **A06: Vulnerable Components** | Pinned dependencies and automated vulnerability checking (`npm audit`). |
| **A07: Identification & Auth Failures** | 3-strike account lock, 5 req/min login rate limiting, server-side token revocation on logout/lockout. |
| **A08: Software & Data Integrity** | SHA-256 media hashing, chained audit trail, anti-mock GPS detection. |
| **A09: Security Logging & Monitoring Failures** | Append-only chained audit log, live telemetry alerts via Socket.IO, security breach notification events. |
| **A10: Server-Side Request Forgery (SSRF)** | No arbitrary outbound URL fetching permitted from user inputs. |

---

## 9. Verification & Automated Test Suite

AttendX includes an automated security test suite validating all core security deliverables:

```bash
# Run security test suite from repository root
npm run test:security
```

### Verified Test Cases:
1. `lockout-after-3-attempts`: Validates that 3 consecutive failed passwords lock the account server-side, blocking subsequent attempts even with valid credentials until an administrator unlocks the account.
2. `rejected-request-outside-geofence`: Confirms coordinates submitted outside authorized section geofence return HTTP 403 Forbidden with breach telemetry.
3. `rejected-oversized-upload`: Confirms JSON payloads exceeding the 2MB size cap are rejected by body-parser with HTTP 413 Payload Too Large.
4. `rejected-malformed-input`: Confirms out-of-range GPS coordinates (e.g. Lat > 90) or missing required fields are rejected with HTTP 400 Bad Request before controller invocation.
