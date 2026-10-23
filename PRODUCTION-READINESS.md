# PRODUCTION-READINESS — HELSA

## Verdict
**NOT PRODUCTION READY** until required secrets/providers below are configured and verified in a staging environment.

## Required before go-live
1. `DATABASE_URL` (managed Postgres + backups)
2. `AUTH_SECRET` (>=32 chars, unique per environment)
3. `NEXT_PUBLIC_SITE_URL=https://your-domain`
4. HTTPS termination
5. `ADMIN_EMAILS` for operators
6. SMS provider if OTP/password-reset remain enabled
7. Payment gateway keys if online payment remains enabled
8. Google/Apple OAuth secrets if social login remains enabled

## Security checklist
- [x] No client-authoritative login
- [x] Hashed passwords
- [x] Hashed OTP/reset challenges
- [x] Signed HttpOnly session cookie
- [x] Admin server authorization
- [x] Order ownership checks
- [x] Server-side money recalculation
- [x] Payment amount from DB
- [x] Security headers
- [x] CSRF same-origin guards
- [x] Rate limits (single-node)
- [ ] Shared rate-limit store for multi-instance
- [ ] Real SMS delivery verified
- [ ] Real payment capture verified end-to-end
- [ ] Backup/restore drill
- [ ] Error monitoring (Sentry/equivalent)

## Disable-or-configure policy
If a provider is missing in production:
- Social login redirects to unconfigured state
- Online payment stays unavailable/unconfigured
- OTP/reset must not be marketed as fully available until SMS works
