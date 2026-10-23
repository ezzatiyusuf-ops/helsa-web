# SECURITY-AUDIT-FINAL — HELSA

## Executive verdict
Core critical auth bypasses and order IDOR are fixed.  
**Production readiness still depends on provider/secrets configuration.**

## Critical issues fixed
1. Client-side fake login/OTP bypass → replaced with server auth + HttpOnly JWT session.
2. Reset API returning demo code → hashed single-use challenges; optional dev hint only via `ALLOW_DEV_OTP_HINT`.
3. Hardcoded session secret fallback in production path → removed; `AUTH_SECRET` required for prod.
4. Order IDOR on `GET /api/orders/[id]` → session + ownership checks.
5. Payment verify trusted client amount → amount loaded from DB order.

## High issues fixed
- CSRF same-origin checks on state-changing auth/commerce/admin routes.
- Rate limits on auth and sensitive endpoints.
- Open redirect hardening (`safeNextPath`, canonical/public origin handling).
- Security headers (CSP, HSTS, XFO, nosniff, referrer, permissions).
- Admin defense-in-depth (middleware cookie presence + server allowlist/role).
- SW private-route cache exclusions expanded.

## Auth architecture now
- Passwords: scrypt hashes on `customers.password_hash`
- OTP/reset: `auth_challenges` with SHA-256 hashes, expiry, attempt limits, consume-once
- Session: jose HS256 JWT (`sub/role/iss/aud/exp`) in `helsa_session` HttpOnly cookie
- Admin: `ADMIN_EMAILS` allowlist AND signed `role=admin`

## Residual risks
- In-process rate limiter is single-node.
- OTP/reset delivery needs real SMS/email provider.
- Online payment still provider-config dependent.
- `ALLOW_DEV_OTP_HINT` must remain disabled in real production.

## Final status
**NOT PRODUCTION READY** until secrets/providers above are configured and staging-verified.  
Security baseline for authentication/authorization/API money paths is substantially hardened.
