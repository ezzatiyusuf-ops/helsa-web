# احراز هویت هلسا (AUTHENTICATION)

## وضعیت واقعی پیاده‌سازی

احراز هویت **سمت سرور** است و دیگر به login جعلی کلاینت وابسته نیست.

| قابلیت | وضعیت |
| --- | --- |
| ثبت‌نام با رمز | ✅ API سرور + scrypt hash |
| ورود با رمز | ✅ API سرور + generic errors |
| OTP | ✅ challenge هش‌شده + rate limit (SMS اختیاری) |
| بازیابی رمز | ✅ token/OTP هش‌شده + single-use |
| Google OAuth | ✅ در صورت پیکربندی |
| Apple Sign in | ✅ در صورت پیکربندی |
| Session JWT | ✅ jose HS256 + issuer/audience |
| Admin allowlist | ✅ `ADMIN_EMAILS` + role claim |
| Demo OTP در production | ❌ عمداً غیرفعال |

## فایل‌ها

| فایل | نقش |
| --- | --- |
| `src/lib/session.ts` | JWT session، cookie options |
| `src/lib/auth-service.ts` | register/login/otp/reset/oauth customer upsert |
| `src/lib/security.ts` | rate limit، CSRF same-origin، headers helpers |
| `src/lib/safe-url.ts` | جلوگیری از open redirect |
| `src/app/api/auth/*` | endpointهای auth |
| `src/middleware.ts` | soft gate برای admin + no-store روی مسیرهای حساس |
| `src/components/auth/AuthPanel.tsx` | UI هلسا که فقط API سرور را صدا می‌زند |

## کوکی نشست

- نام: `helsa_session`
- HttpOnly: yes
- SameSite: Lax
- Secure: در production
- Path: `/`
- TTL: 7 روز
- امضا: HS256 با `AUTH_SECRET`
- Claims: `sub`, `name`, `email`, `phone?`, `provider`, `role`, `iss`, `aud`, `iat`, `exp`

**هیچ fallback secret در production وجود ندارد.**

## APIها

### `POST /api/auth/register`
Body: `{ name, family, phone, email, password }`
- حداقل رمز: ۸ کاراکتر
- phone یکتا / email یکتا
- پاسخ حساب موجود: پیام عمومی (ضد enumeration)
- rate limit: 8 / 15min / IP
- CSRF same-origin

### `POST /api/auth/login`
Body: `{ identifier, password }`
- پیام خطا همیشه عمومی است
- rate limit: 10 / 15min / IP

### `POST /api/auth/otp/request`
Body: `{ phone }`
- OTP فقط به‌صورت SHA-256 ذخیره می‌شود
- انقضا: ۵ دقیقه
- max attempts: ۵
- در production اگر SMS پیکربندی نشده باشد، کد برنمی‌گردد

### `POST /api/auth/otp/verify`
Body: `{ phone, code }`
- single-use
- rate limit: 10 / 15min / IP

### `POST /api/auth/reset`
- `step: "request" | "reset"`
- کد/توکن هش‌شده، single-use، attempt-limited
- پیام request همیشه عمومی است

### OAuth
- state cookie تصادفی
- callback فقط با state معتبر
- customer در DB upsert می‌شود
- session سرور ساخته می‌شود

## الزامات production

```env
AUTH_SECRET=<openssl rand -base64 48>
ADMIN_EMAILS=owner@helsairanian.ir
NEXT_PUBLIC_SITE_URL=https://helsairanian.ir
SMS_PROVIDER=...
SMS_API_KEY=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
APPLE_CLIENT_ID=...
APPLE_TEAM_ID=...
APPLE_KEY_ID=...
APPLE_PRIVATE_KEY=...
```

## نکات امنیتی

- OTP/reset code هرگز در production response برنمی‌گردد.
- UI دیگر با `123456` کاربر را وارد نمی‌کند.
- `next=` فقط path نسبی safe را می‌پذیرد.
- Admin فقط با session امضاشده + allowlist + role.
- Password با scrypt ذخیره می‌شود.


## Development-only OTP hint

Set `ALLOW_DEV_OTP_HINT=1` only in local/dev when SMS is unset to receive `devCode` in API responses for testing. Never enable on real production traffic.
