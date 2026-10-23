#!/usr/bin/env python3
"""HELSA — پروپوزال تکمیل و راه‌اندازی تولید (جهت ارائه به سرمایه‌گذار/شریک).
خروجی: docs/helsa-production-proposal.html — تک‌فایل خودکفا (فونت/لوگو/عکس جاسازی‌شده).
ارقام مالی عمداً [—] است (تکمیل توسط مالک). حقایق فنی از گزارش‌های ممیزی مستقل پروژه.
اجرا: python3 scripts/make-proposal-booklet.py  سپس  node scripts/print-proposal.mjs
"""
import base64
import re
from datetime import datetime

OUT = "docs/helsa-production-proposal.html"
FONT = "public/fonts/Vazirmatn-Variable.woff2"
LOGO = "public/brand/helsa-corporate-logo.png"
THUMBS = "/tmp/booklet-imgs"


def b64(path: str, mime: str) -> str:
    with open(path, "rb") as f:
        return f"data:{mime};base64," + base64.b64encode(f.read()).decode()


def inline(t: str) -> str:
    t = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", t)
    t = re.sub(r"`([^`]+)`", r"<code>\1</code>", t)
    return t


def md_to_html(md: str) -> str:
    lines, html, i = md.split("\n"), [], 0
    while i < len(lines):
        ln = lines[i]
        if ln.startswith("|"):
            rows = []
            while i < len(lines) and lines[i].startswith("|"):
                cells = [c.strip() for c in lines[i].strip().strip("|").split("|")]
                if not all(re.fullmatch(r":?-{2,}:?", c or "---") for c in cells):
                    rows.append(cells)
                i += 1
            head = "".join(f"<th>{inline(c)}</th>" for c in rows[0])
            body = "".join("<tr>" + "".join(f"<td>{inline(c)}</td>" for c in r) + "</tr>" for r in rows[1:])
            html.append(f'<table><thead><tr>{head}</tr></thead><tbody>{body}</tbody></table>')
            continue
        if ln.startswith("> "):
            html.append(f'<blockquote>{inline(ln[2:])}</blockquote>')
        elif ln.strip() == "---":
            html.append('<hr class="sep">')
        elif ln.startswith("!!IMG"):
            cells = [c.strip().split("|", 1) for c in ln[5:].split(";") if c.strip()]
            figs = "".join(
                f'<figure class="ph"><img src="{THUMB_B64.get(name, "")}" alt="{cap}">'
                f"<figcaption>{cap}</figcaption></figure>"
                for name, cap in cells
            )
            html.append(f'<div class="pgrid">{figs}</div>')
        elif re.match(r"^\d+\. ", ln):
            html.append(f'<div class="li n">{inline(ln)}</div>')
        elif ln.startswith("- "):
            html.append(f'<div class="li">• {inline(ln[2:])}</div>')
        elif ln.strip():
            html.append(f"<p>{inline(ln)}</p>")
        i += 1
    return "\n".join(html)


SECTIONS: list[tuple[str, str, str]] = [
("۱", "خلاصهٔ مدیریتی", """
هلسا مارکت — فروشگاه آنلاین خوراکی‌های ممتاز ایرانی — از نظر فنی **ساخته‌شده، تست‌شده و در حال اجرا** است؛ نه یک ایده یا نمونهٔ اولیه. آنچه ماندهٔ رسیدن به «تولید کامل» نیست جز چند قلم **زیرساخت و اعتبارنامهٔ بیرونی** (دیتابیس ابری، قرارداد درگاه پرداخت، خط پیامک) و یک مرحلهٔ راستی‌آزمایی نهایی است.

این پروپوزال:
1. وضعیت موجود را با **شواهد قابل ممیزی** نشان می‌دهد (بخش ۲)؛
2. شکاف دقیق تا تولید را فهرست می‌کند (بخش ۳)؛
3. طرح اجرایی **شش‌فازی** با زمان‌بندی و معیار پذیرش ارائه می‌دهد (بخش‌های ۴، ۵ و ۷)؛
4. چارچوب بودجه را با جای خالی [—] برای تکمیل توسط مالک می‌دهد (بخش ۶).

> جمع‌بندی: برآورد تلاش توسعهٔ باقی‌مانده **۸ تا ۱۴ روز کاری** و بازهٔ رسیدن به تولید **۲ تا ۴ هفته** است — گلوگاه اصلی، زمان فرایند پذیرندگی درگاه پرداخت است، نه توسعه.

**درخواست:** تأمین بودجهٔ اجرا [—] و همراهی در فرایندهای پذیرندگی و تصمیم‌های تجاری فهرست‌شده در بخش ۹.
"""),

("۲", "هلسا امروز — چه چیزی ساخته شده است", """
سایت هلسا روی helsa-web.onrender.com در حال سرویس است: کاتالوگ کامل، صفحات محتوا، فروشگاه و سبد خرید فعال‌اند. همهٔ ادعاهای زیر مستند و قابل بازبینی در گزارش‌های ممیزی داخل مخزن پروژه است.

| محور | وضعیت | شاهد |
|---|---|---|
| کاتالوگ | ۱۸۴ محصول اعتبارسنجی‌شده | صفر SKU تکراری · صفر قیمت نامعتبر · صفر موجودی منفی · صفر عکس گم‌شده |
| ابعاد سیستم | ۲۹۵ صفحهٔ استاتیک + ۷۱ نقطهٔ API | خروجی بیلد و فهرست مسیرها |
| کیفیت/تست | سبز | ۱۴/۱۴ تست یونیت · گایت انتشار ۱۸ PASS / 0 FAIL |
| ممیزی | ۴ گزارش مستقل | PRODUCTION-AUDIT و V2/V3/V4 (وضعیت: «آماده با محدودیت‌های مستند») |
| امنیت | سخت‌گیری شده | هدرهای امنیتی کامل · CSRF · رمزنگاری scrypt · ورود دومرحله‌ای با کد یک‌بارمصرف و محدودیت نرخ |
| پرداخت | معماری تولیدی | تأیید سرور-به-سرور مبلغ · نهایی‌سازی اتمیک ضد-بازپخش · ۴ درگاه پیاده‌سازی‌شده |
| انبار | ضد-فروش-بیش-از-موجودی | کاهش اتمیک موجودی داخل تراکنش دیتابیس |
| تصاویر | واقعی | ۱۵/۱۵ عکس واقعی محصولات، تأیید پیکسلی |

!!IMG lahijan-black-tea|چای سیاه لاهیجان; date-bar|دیت‌بار هلسا; walnut-kernels|گردوی تازه ایرانی

**کانال‌های درآمدی که همین حالا روی کد فعال‌اند:** خرده‌فروشی (۱۸۴ محصول) · خرید عمده (حداقل ۵٬۰۰۰٬۰۰۰ تومان) · هدایای سازمانی (۱۲ بستهٔ آماده + استعلام سفارشی) · سینی‌های مزه (۹ سینی + مزه‌ساز شخصی با برآورد لحظه‌ای قیمت).

**امکانات رشد از پیش‌ساخته:** کوپن‌ها و کمپین‌های فصلی · خبرنامه با صدور خودکار کد اولین خرید · مقایسه و علاقه‌مندی · مجله و محتوای سلامت (۸ مقاله، ۸ راهنمای محصول، ۱۲ محتوای سلامت) برای سئو · پنل ادمین کامل ۱۳ بخشی.
"""),

("۳", "شکاف تا تولید کامل — فهرست صادقانه", """
سایت امروز در حالت «کاتالوگ ایستا» اجرا می‌شود؛ یعنی مرور و انتخاب کالا کامل است اما ثبت سفارش، ورود با کد پیامکی و پنل ادمین به اتصال دیتابیس و سرویس‌های بیرونی نیاز دارند. این جدول، **تمام** کارهای باقی‌مانده است:

| کد | مورد | چه چیزی را فعال می‌کند |
|---|---|---|
| L-01 | اتصال دیتابیس ابری و متغیر محیطی آن | ثبت سفارش · حساب مشتری · ادمین · کوپن سروری |
| L-02 | کلیدهای امنیتی و تنظیمات تولید | ورود امن · نشست‌ها · آدرس رسمی سایت |
| O-01a | قرارداد پذیرندگی و کلید درگاه | پرداخت واقعی آنلاین |
| O-01b | خط پیامک خدماتی | کد ورود یک‌بارمصرف و اطلاع‌رسانی سفارش |
| O-01c | ابزار تحلیل (GTM) | اندازه‌گیری فروش و بازاریابی |
| B-01 | تصمیم قیمت یک محصول (rosebuds) | یکپارچگی کامل دادهٔ کاتالوگ |
| V-01 | راستی‌آزمایی نهایی روی محیط آزمایشی | اطمینان انتشار بدون رگرسیون |

> هیچ‌یک از این موارد نیازمند بازنویسی یا توسعهٔ جدید نیست؛ پیاده‌سازی همه از قبل در کد موجود و تست‌شده است و فقط به اعتبارنامه/پیکربندی/تصمیم نیاز دارد.
"""),

("۴", "طرح اجرایی — شش فاز", """
**فاز ۰ — آماده‌سازی و پشتیبان‌گیری (۱ روز کاری)**
- بکاپ کامل از دیتابیس و تأیید قابلیت بازیابی · ساخت محیط آزمایشی (staging) با دادهٔ واقعی · ثبّت خط پایهٔ تست‌ها.

**فاز ۱ — زیرساخت تولید (۱ تا ۲ روز کاری)**
- راه‌اندازی دیتابیس ابری · تزریق متغیرهای محیطی و کلیدها (فقط نام‌ها: `DATABASE_URL`، `AUTH_SECRET`، `ADMIN_EMAILS`، `NEXT_PUBLIC_SITE_URL`) · اتصال دامنهٔ رسمی و گواهی SSL · اجرای اسکریپت‌های اصلاح دادهٔ تکرارپذیر.
- خروجی: `/api/health` سبز؛ ثبت سفارش آزمایشی روی تولید موفق.

**فاز ۲ — درگاه پرداخت واقعی (۲ تا ۴ روز کاری توسعه + زمان پذیرندگی [—])**
- تکمیل مدارک پذیرندگی با هماهنگی مالک · فعال‌سازی یکی از درگاه‌های پیاده‌سازی‌شده (شاپرک/دیجی‌پی/اسنپ‌پی) · تست سندباکس · **تست واقعی با مبلغ کم** (ثبت، پرداخت، بازگشت وجه) و پاک‌سازی دادهٔ تست.
- خروجی: یک تراکنش واقعی موفق روی حساب پذیرنده.

**فاز ۳ — پیامک و ورود با کد (۱ تا ۲ روز کاری)**
- انتخاب اپراتور و شمارهٔ خدماتی · پیکربندی پروایدر · تست دریافت واقعی کد روی موبایل آزمایشی · پایش نرخ ارسال.

**فاز ۴ — تحلیل و سئو (۱ روز کاری)**
| ابزار | کار |
|---|---|
| Google Tag Manager | رویدادهای افزودن به سبد، آغاز تسویه، خرید موفق |
| Search Console | تأیید مالکیت · نقشهٔ سایت · پایش ایندکس |
| Points محتوایی | اتصال متادیتای تولیدشده (به‌صورت خودکار از دادهٔ محصولات) |

**فاز ۵ — راستی‌آزمایی نهایی و انتشار (۲ تا ۳ روز کاری)**
- سناریوی کامل خرید واقعی (جست‌وجو → انتخاب وزن → سبد → کوپن → پرداخت → پیگیری) روی staging و سپس تولید · تست‌های مرزی (سبد خالی، کد منقضی، موجودی تغییرکرده، پرداخت تکراری) · جلسهٔ آموزش پنل ادمین [—] ساعت · مستندسازی تحویل.

**فاز ۶ (اختیاری) — پایداری و پشتیبانی**
- بکاپ خودکار روزانه با نگهداشت ۷ نسخه · پایش دسترس‌پذیری و هشدار · قرارداد پشتیبانی ماهانه [—].
"""),

("۵", "زمان‌بندی کلی", """
| هفته | فاز | خروجی کلیدی |
|---|---|---|
| ۱ | فاز ۰ + ۱ | دیتابیس و امنیت متصل؛ سفارش ثبت می‌شود |
| ۱–۲ | فاز ۲ (شروع مدارک از هفتهٔ ۱) | درگاه تست‌شده و فعال |
| ۲ | فاز ۳ + ۴ | پیامک و تحلیل فعال |
| ۳–۴ | فاز ۵ | انتشار کامل + آموزش + تحویل |

- **جمع تلاش توسعه:** ۸ تا ۱۴ روز کاری.
- **مسیر بحرانی:** فرایند پذیرندگی درگاه (خارج از کنترل فنی) — به همین دلیل مدارک از هفتهٔ اول آغاز می‌شود و درگاه جایگزین دوم نیز از قبل در کد آماده است.
"""),

("۶", "بودجه — چارچوب برای تکمیل", """
ارقام زیر عمداً خالی [—] است تا با اعداد واقعی قراردادها تکمیل شود؛ ساختار هزینه‌ها بر اساس نیاز واقعی پروژه تنظیم شده است.

| ردیف | شرح | نوع | مبلغ/نرخ |
|---|---|---|---|
| ۱ | سرور و دیتابیس ابری (ماهانه) | جاری | [—] |
| ۲ | راه‌اندازی و اجرای فازهای ۰ تا ۵ | یک‌باره | [—] |
| ۳ | کارمزد درگاه پرداخت | درصدی قراردادی | [—]٪ |
| ۴ | خط و تعرفهٔ پیامک | جاری | [—] |
| ۵ | دامنه و گواهی | سالانه | [—] |
| ۶ | پشتیبانی و نگهداشت (اختیاری، فاز ۶) | ماهانه | [—] |
| ۷ | **جمع سال اول (تخمینی)** | — | **[—]** |

> شفافیت: هیچ هزینهٔ پنهانی در کد نیست؛ فهرست دقیق متغیرهای محیطی و دستورالعمل استقرار/بازگشت در بخش ۱۱ و مخزن پروژه مستند شده است.
"""),

("۷", "معیارهای پذیرش — «تحویل‌شده» یعنی چه", """
| # | معیار | ابزار سنجش |
|---|---|---|
| ۱ | `/api/health` وضعیت دیتابیس سبز | بازرسی مستقیم |
| ۲ | سفارش واقعی از جست‌وجو تا پیگیری موفق | تست دستی مستند |
| ۳ | یک تراکنش واقعی و یک بازگشت وجه آزمایشی | صورت‌حساب پذیرنده |
| ۴ | کد پیامکی واقعی به موبایل آزمایشی رسید | پیام دریافت‌شده |
| ۵ | همهٔ تست‌های خودکار سبز | ۱۴ یونیت + گایت ۱۸گانه |
| ۶ | بیلد بدون خطا | ۲۹۵ صفحه |
| ۷ | ادمین آموزش‌دیده و گزارش تحویل امضا‌شده | جلسهٔ آموزش |

هر فاز تنها با احراز معیار خودش «تمام» تلقی می‌شود؛ طبق قاعدهٔ پروژه، هیچ ادعایی بدون تست ثبت نمی‌شود.
"""),

("۸", "ریسک‌ها و برنامهٔ کاهش", """
| ریسک | احتمال | اثر | کاهش |
|---|---|---|---|
| طولانی‌شدن پذیرندگی درگاه | متوسط | تأخیر فاز ۲ | شروع مدارک از هفتهٔ ۱؛ درگاه‌های جایگزین از قبل پیاده‌شده |
| عدم تحویل پیامک در ساعات اوج | کم | تجربهٔ ورود | پروایدر قابل تعویض در چند دقیقه؛ ورود با رمز همیشه فعال |
| تصمیم‌های داده‌ای معلق (B-01) | قطعیِ فعلی | یکپارچگی کاتالوگ | یک تصمیم مالک؛ اصلاح با اسکریپت تکرارپذیر |
| نوسان قیمت محصولات | قطعی | اعتبار نمایش | قیمت فقط از دیتابیس؛ پنل ادمین برای به‌روزرسانی فوری |
| وابستگی به سرویس ابری | کم | قطعی سرویس | بکاپ روزانه خروج از سرویس + توانایی بازیابی در محیط دیگر (مستند و تست‌شده) |
| تغییر نیازمندی پس از انتشار | متوسط | دوباره‌کاری | معماری ماژولار؛ گزارش ممیزی برای مدیریت تغییر |

> نکتهٔ ریسک فنی: ریسک‌های امنیتی شناخته‌شدهٔ متداول (بازپخش پرداخت، فروش بیش از موجودی، دسترسی ادمین، CSRF) از قبل در کد رفع و در ۴ گزارش ممیزی مستند شده‌اند — این یعنی بخش عمدهٔ ریسک فنی، پیش از سرمایه‌گذاری مصرف شده است.
"""),

("۹", "درخواست از سرمایه‌گذار / شریک", """
1. **تأمین بودجهٔ اجرا:** طبق جدول بخش ۶ — [—].
2. **همراهی اداری:** تکمیل مدارک پذیرندگی درگاه (نیازمند مدارک رسمی کسب‌وکار) و اخذ خط خدماتی پیامک.
3. **تصمیم‌های تجاری:** قیمت‌گذاری نهایی محصول rosebuds · انتخاب اپراتور پیامک · دامنهٔ رسمی · سقف پرداخت در محل.
4. **حکمرانی داده:** تعیین مالک داده و دسترسی‌های ادمین (فهرست افراد مجاز).

در مقابل، تحویل قابل ممیزی است: معیارهای بخش ۷، گزارش‌های ممیزی موجود و تاریخچهٔ کامل تغییرات در مخزن.
"""),

("۱۰", "ارزش پیشنهادی و مسیر درآمد", """
- **چهار کانال فروش از روز اول:** خرده‌فروشی، عمده، سازمانی و سینی مزه — همه روی همین کد فعال‌اند و فقط روشن‌شدن تولید را می‌خواهند.
- **ریسک فنی پایین:** آنچه معمولاً در پروژه‌های فروشگاهی پرهزینه‌ترین بخش است (پرداخت امن، انبار، احراز هویت، ادمین) اینجا ساخته و تست شده است؛ سرمایه روی رشد خرج می‌شود نه رفع خرابی.
- **دارایی محتوایی:** مجله، راهنماهای انتخاب و مرکز سلامت — پایهٔ سئوی ارگانیک که در بازار فارسی مزیت رقابتی کم‌هزینه است.
- **قابلیت توسعه:** معماری ماژولار (درگاه‌های بیشتر، کیف پول — از پیش طراحی‌شده)، بازارهای صادراتی و اشتراک‌ها.

ارقام بازار و پیش‌بینی فروش به‌دلیل قاعدهٔ «هیچ عدد جعلی» در این نسخه درج نشده و با دادهٔ واقعی مالک در نسخهٔ نهایی تکمیل می‌شود: اندازهٔ بازار [—] · پیش‌بینی فروش ۶ ماه [—] · نقطهٔ سربه‌سر [—].
"""),

("۱۱", "ضمیمه — شواهد فنی و راهنمای استقرار", """
**گزارش‌های ممیزی (در مخزن پروژه):** `PRODUCTION-AUDIT-REPORT.md` (دور ۱) · `AUDIT-V2-REPORT.md` · `AUDIT-V3-REPORT.md` · `AUDIT-V4-REPORT.md`.

**خلاصهٔ نتایج تست آخرین دور:**

| تست | نتیجه |
|---|---|
| تست یونیت | ۱۴/۱۴ پاس |
| بررسی نوع‌ها (tsc) | بدون خطا |
| بیلد تولیدی | موفق — ۲۹۵ صفحه |
| گایت انتشار | ۱۸ PASS / 0 FAIL |
| تست مرور صفحات کلیدی | همه ۲۰۰ |
| اعتبارسنجی کاتالوگ | ۱۸۴/۱۸۴ سالم |

**عملیات استقرار (خلاصه؛ مستندات کامل در مخزن):**
- متغیرهای لازم (فقط نام): `DATABASE_URL` · `AUTH_SECRET` · `ADMIN_EMAILS` · `NEXT_PUBLIC_SITE_URL` · `PAYMENT_*` · `SMS_*`
- انتشار با هر پوش خودکار (~۳ دقیقه) · اسکریپت پوش، تصاویر را بازسازی و پیکسلاً تأیید می‌کند.
- پشتیبان‌گیری: `npm run db:backup` (خروجی فشرده + چک‌سام، نگهداشت ۷ نسخه) · بازیابی: `npm run db:restore`.
- بازگشت (rollback): بازگشت به کامیت پیشین و انتشار مجدد؛ مهاجرت‌ها غیرمخربند.
- اسموک پس از انتشار: سلامت سرویس · صفحهٔ محصول · تصویر محصول · سفارش آزمایشی و حذف · ورود ادمین.

**قواعد حاکم بر پروژه (پایهٔ اعتماد):** هیچ ادعای «انجام‌شده» بدون تست · دادهٔ ساختگی ممنوع · رازها فقط در متغیر محیطی · حفظ کامل دادهٔ مشتری و تاریخ سفارش‌ها.
"""),

("۱۲", "گام بعدی", """
1. تأیید پروپوزال و تکمیل ارقام [—] توسط مالک/سرمایه‌گذار.
2. امضای سند دامنه و شروع فاز ۰ (پشتیبان‌گیری — بدون ریسک).
3. ارسال مدارک پذیرندگی درگاه در همان هفته (مسیر بحرانی).
4. جلسهٔ بازبینی وضعیت هفتگی با گزارش پیشرفت شواهدمحور.

> مخزن کد، گزارش‌های ممیزی و دفترچهٔ راهنمای سایت برای بازبینی کامل در اختیار قرار می‌گیرد: کیفیت ادعاهای این سند در همان‌ها قابل راستی‌آزمایی است.

**تماس:** بازرگانی هلسا ایرانیان · ۰۲۱-۵۶۱۳۰۸۵۸ · ۰۹۳۷-۹۱۰۵۱۳۳ · اینستاگرام `@Helsa.Nuts`
"""),
]

FONT_B64 = b64(FONT, "font/woff2")
LOGO_B64 = b64(LOGO, "image/png")
THUMB_B64 = {n: b64(f"{THUMBS}/{n}.jpg", "image/jpeg") for n in
             ["lahijan-black-tea", "date-bar", "walnut-kernels"]}


def main() -> None:
    toc, body = [], []
    for num, title, md in SECTIONS:
        toc.append((num, title))
        body.append(f'<section><h2><span class="secnum">{num}</span>{title}</h2>{md_to_html(md.strip())}</section>')
    toc_html = "".join(
        f'<div class="toc-row"><span class="toc-num">{n}</span><span class="toc-t">{t}</span></div>'
        for n, t in toc
    )
    html = f"""<!doctype html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>پروپوزال تکمیل و راه‌اندازی تولید — هلسا مارکت</title>
<style>
  @font-face {{ font-family:"Vazirmatn"; src:url("{FONT_B64}") format("woff2"); font-weight:100 900; font-display:block; }}
  @page {{ size: A4 portrait; margin: 16mm 15mm 18mm; }}
  @page cover {{ margin: 0; }}
  * {{ box-sizing: border-box; }}
  body {{ font-family:"Vazirmatn",Tahoma,sans-serif; color:#201f1b; font-size:10pt; line-height:1.95; margin:0; background:#fff; }}
  .cover {{ page: cover; page-break-after: always; position:relative; min-height:297mm; background:linear-gradient(165deg,#0b5f3b 0%,#08422c 52%,#06301f 100%); color:#fffdf9; padding:26mm 22mm; }}
  .cover::before {{ content:""; position:absolute; inset:0; opacity:.55;
    background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='96' height='96' viewBox='0 0 96 96'%3E%3Cg fill='none' stroke='%23faf7f0' stroke-opacity='0.07' stroke-width='1'%3E%3Cpath d='M48 6l10 16 18-5-5 18 16 10-16 10 5 18-18-5-10 16-10-16-18 5 5-18-16-10 16-10-5-18 18 5z'/%3E%3Ccircle cx='48' cy='48' r='7'/%3E%3C/g%3E%3C/svg%3E"); }}
  .cover .logo-plate {{ position:relative; display:inline-block; background:#fffdf9; border-radius:18px; padding:9px 20px; box-shadow:0 14px 40px -16px rgba(0,0,0,.45); }}
  .cover .logo-plate img {{ height:20mm; display:block; }}
  .cover .brand {{ position:relative; margin-top:12mm; font-size:12pt; font-weight:800; letter-spacing:.35em; color:#e2cf94; }}
  .cover h1 {{ position:relative; font-size:25pt; font-weight:900; margin:7mm 0 4mm; line-height:1.65; }}
  .cover .sub {{ position:relative; font-size:11pt; color:#ffffffcc; max-width:150mm; line-height:2.05; }}
  .cover .rule {{ position:relative; width:34mm; height:2px; margin:7mm 0; background:linear-gradient(to left,transparent,#b3922f,transparent); }}
  .cover .chips {{ position:relative; display:flex; flex-wrap:wrap; gap:3mm; margin-top:9mm; }}
  .cover .chip {{ border:1px solid rgba(250,247,240,.35); border-radius:999px; padding:1.8mm 5mm; font-size:8.6pt; font-weight:700; color:#faf7f0; }}
  .cover .meta {{ position:absolute; bottom:14mm; right:22mm; left:22mm; display:flex; justify-content:space-between; font-size:8.6pt; color:#ffffffaa; border-top:1px solid rgba(250,247,240,.25); padding-top:4mm; }}
  .toc {{ page-break-after: always; }}
  .toc h2 {{ border:none !important; padding:0 !important; background:none !important; color:#08422c !important; display:block !important; }}
  .toc-grid {{ display:grid; grid-template-columns:1fr 1fr; gap:0 8mm; margin-top:6mm; }}
  .toc-row {{ display:flex; align-items:baseline; gap:3mm; padding:1.4mm 0; border-bottom:1px dotted #e6ddcb; font-size:10pt; }}
  .toc-num {{ min-width:8mm; font-weight:900; color:#b3922f; font-size:9pt; }}
  .toc-t {{ color:#403d36; }}
  h2 {{ display:flex; align-items:center; gap:3.5mm; font-size:14.5pt; font-weight:900; color:#fffdf9; background:linear-gradient(100deg,#0a5236,#0b5f3b); border-radius:13px; padding:4mm 6mm; margin:8mm 0 4mm; break-after:avoid; page-break-after:avoid; }}
  h2 .secnum {{ background:#b3922f; color:#fffdf9; min-width:9.5mm; text-align:center; border-radius:8px; font-size:10pt; padding:1mm 2mm; }}
  section:first-of-type h2 {{ margin-top:0; }}
  p {{ margin:1.8mm 0; text-align:justify; }}
  b {{ font-weight:800; }}
  code {{ font-family:inherit; background:#faf7f0; border:1px solid #f3eee3; border-radius:5px; padding:0 1.6mm; font-size:8.7pt; color:#0a5236; direction:ltr; display:inline-block; }}
  table {{ width:100%; border-collapse:collapse; margin:3mm 0; font-size:8.8pt; }}
  th {{ background:#0b5f3b; color:#fffdf9; font-weight:800; padding:2mm 2.6mm; text-align:right; border:1px solid #08422c; }}
  td {{ padding:1.8mm 2.6mm; border:1px solid #e6ddcb; vertical-align:top; }}
  tbody tr:nth-child(even) td {{ background:#faf7f0; }}
  tr {{ break-inside:avoid; page-break-inside:avoid; }}
  blockquote {{ background:#faf7f0; border-right:3px solid #b3922f; border-radius:10px; padding:3mm 5mm; margin:3mm 0; font-weight:700; color:#08422c; break-inside:avoid; }}
  .li {{ margin:1mm 0; padding-right:2mm; }}
  .li.n {{ font-weight:700; }}
  hr.sep {{ border:none; border-top:1px solid #e6ddcb; margin:5mm 0; }}
  .pgrid {{ display:grid; grid-template-columns:repeat(3,1fr); gap:4mm; margin:4mm 0; break-inside:avoid; page-break-inside:avoid; }}
  .pgrid figure {{ margin:0; text-align:center; }}
  .pgrid img {{ width:100%; aspect-ratio:1/1; object-fit:cover; border-radius:12px; border:1px solid #e6ddcb; }}
  .pgrid figcaption {{ font-size:8.3pt; font-weight:700; color:#403d36; margin-top:1.4mm; }}
  @media screen {{ body {{ background:#efe9dc; max-width:210mm; margin:0 auto; padding:0 6mm 10mm; }} .cover{{border-radius:0 0 18px 18px;}} }}
</style>
</head>
<body>
<div class="cover">
  <div class="logo-plate"><img src="{LOGO_B64}" alt="لوگوی هلسا ایرانیان"></div>
  <div class="brand">H E L S A</div>
  <h1>پروپوزال تکمیل و راه‌اندازی تولید<br>هلسا مارکت</h1>
  <div class="sub">پلتفرم فروشگاهی هلسا ساخته‌شده، تست‌شده و در حال اجراست؛ این سند طرح شش‌فازی رسیدن به تولید کامل را با شواهد قابل ممیزی، زمان‌بندی، معیارهای پذیرش و چارچوب بودجه ارائه می‌دهد. جهت ارائه به سرمایه‌گذار / شریک.</div>
  <div class="rule"></div>
  <div class="chips">
    <span class="chip">۱۸۴ محصول فعال</span>
    <span class="chip">۴ گزارش ممیزی</span>
    <span class="chip">۶ فاز اجرایی</span>
    <span class="chip">۸ تا ۱۴ روز کاری توسعه</span>
    <span class="chip">۴ کانال فروش آماده</span>
    <span class="chip">helsa-web.onrender.com</span>
    <span class="chip">نسخهٔ ۱.۰</span>
  </div>
  <div class="meta">
    <span>بازرگانی هلسا ایرانیان — محرمانه · جهت ارزیابی سرمایه‌گذاری</span>
    <span>نسخهٔ ۱.۰ — مهر ۱۴۰۵ / اکتبر ۲۰۲۶</span>
  </div>
</div>
<div class="toc">
  <h2>فهرست بخش‌ها</h2>
  <div class="toc-grid">{toc_html}</div>
  <p style="margin-top:8mm;font-size:9pt;color:#6b675e;">ارقام مالی با علامت [—] برای تکمیل توسط مالک خالی گذاشته شده است؛ همهٔ حقایق فنی از گزارش‌های ممیزی مستند پروژه استخراج شده‌اند.</p>
</div>
{"".join(body)}
</body>
</html>"""
    open(OUT, "w", encoding="utf8").write(html)
    print(f"✓ ساخته شد: {OUT} ({len(SECTIONS)} بخش، {len(html)//1024}KB)")


if __name__ == "__main__":
    main()
