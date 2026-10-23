# راهنمای AI هلسا — AI-GUIDE.md

> فاز ۱۵ (AEO) + فاز ۱۶ (معماری AI-ready). این سند هم برای موتورهای پاسخ AI است و هم برای توسعه‌دهنده‌هایی که می‌خواهند AI را به پروژه اضافه کنند.

## ۱. AEO — بهینه‌سازی برای موتورهای پاسخ (Answer Engine Optimization)

هدف: وقتی کسی از ChatGPT/Perplexity/Copilot می‌پرسد «بهترین خرما را از کجا بخرم؟»، هلسا با پاسخ ساخت‌یافته دیده شود.

### چه کار شده

1. **robots.txt** — خزنده‌های AI (GPTBot، OAI-SearchBot، ChatGPT-User، ClaudeBot، anthropic-ai، Claude-Web، PerplexityBot، Perplexity-User، Google-Extended، Bingbot، CopilotBot) صریحاً روی محتوای عمومی مجاز، روی مسیرهای خصوصی منع شده‌اند
2. **JSON-LD کامل** — Organization، Product (با قیمت/موجودی واقعی)، LocalBusiness، FAQPage، Article، BreadcrumbList — بیشترین سیگنال ماشین‌خوان
3. **ساختار پرسش‌وپاسخ** — بخش‌های «سوالات پرتکرار» در صفحات کلیدی با FAQPage schema
4. **متن مستقیم و پاسخ‌پذیر** — بلاگ با پاراگراف‌های کوتاه، لیست، عنوان روشن

### اصول محتوایی AEO

- پاسخ ۴۰–۶۰ کلمه‌ای سؤال را در **اولین پاراگراف** بعد از هدینگ بده
- از جدول و لیست استفاده کن — موتورهای AI اینها را استخراج می‌کنند
- قیمت/واحد/موجودی باید در متن ساخت‌یافته (schema) باشند نه فقط در UI

## ۲. معماری AI-ready

### ۲.۱ چرا این پروژه آماده است

| ویژگی | وضعیت |
| --- | --- |
| داده ساخت‌یافته | PostgreSQL + Drizzle با schema تایپ‌شده — هیچ ETL لازم نیست |
| لایه سرویس تمیز | `src/services/*` (catalog، gifts، wholesale) — قابل فراخوانی از هر AI agent |
| اعتبارسنجی ورودی | Zod در همه API ها — ورودی LLM قابل اعتمادسازی است |
| API های سرور-محور | قیمت/سفارش در سرور — agent کلاینت نمی‌تواند خطای قیمتی تزریق کند |
| sitemap های ماشینی | ۵ sitemap + robots با قانون AI |

### ۲.۲ نقطه‌های اتصال پیشنهادی (آینده)

1. **جستجوی معنایی**: جدول `products` + pgvector روی `name`/`description` (نام‌های فارسی؛ embedding چندزبانه مثل `multilingual-e5`) — endpoint `GET /api/search?q=` از قبل هست، فقط رتبه‌بندی را عوض کن
2. **چت‌بات پشتیبانی**: Route Handler جدید `POST /api/ai/chat` — همان الگوی امنیتی `assertSameOrigin` + `rateLimit` + Zod؛ RAG روی `BLOG_POSTS` + کاتالوگ
3. **توصیه‌گر سینی مزه**: `src/config/tray-builder` (۱۰ دسته × ۳۳ آیتم + فرمول مهمان) به‌سادگی به LLM داده می‌شود؛ `POST /api/tray-builder/quote` برای اعتبارسنجی قیمت نهایی همان بماند
4. **تولید توضیح محصول**: LLM فقط پیشنهاد بدهد؛ انسان تأیید کند؛ قیمت هرگز از LLM نپذیر

### ۲.۳ قواعد امنیتی برای هر AI feature

1. هر endpoint AI: rate-limit شدیدتر از بقیه (هزینه توکن)
2. پرامپت اینجکشن: ورودی کاربر هرگز مستقیم در system prompt نرفته؛ خروجی LLM قبل از نمایش sanitize شود
3. کلید API فقط در `process.env` سمت سرور — هیچ‌وقت به کلاینت نشت نکند
4. داده مشتری (سفارش/آدرس) فقط با session همان مشتری به مدل برود؛ لاگ‌ها PII نداشته باشند
