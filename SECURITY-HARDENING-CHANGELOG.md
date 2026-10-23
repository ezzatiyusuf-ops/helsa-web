# SECURITY-HARDENING-CHANGELOG

## Authentication
- Replaced client-side fake login/OTP with server auth service.
- Added password hashing (scrypt) on customers.
- Added `auth_challenges` table for hashed OTP/reset codes.
- Session JWT now includes `sub`, `role`, `iss`, `aud` and verified algorithms.
- Cookies use centralized secure options.
- OAuth callbacks upsert customers and issue real sessions.
- Admin authorization checks allowlist + signed role.

## API / abuse controls
- Same-origin CSRF checks on state-changing routes.
- Rate limits on auth, contact, reviews, coupons, orders, payments, admin.
- Generic auth error messages (anti-enumeration).
- Order lookup owner-only.
- Payment verification uses DB amount only.
- Contact/reviews require proper persistence path and validation.
- Coupon validate no longer leaks internal counters.

## Platform
- Security headers in `next.config.ts`.
- Middleware soft-gates `/admin` and disables caching on sensitive paths.
- Service worker never-cache expanded; cache version `helsa-v2`.
- Open-redirect hardening via `safeNextPath` + canonical origin.
