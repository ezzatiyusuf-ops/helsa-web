#!/usr/bin/env python3
"""HELSA — ممیزی تصاویر جلسهٔ ۲۲ (ماندگار و idempotent).
پس از هر بازیابی محیط (env-recover.sh) اجرا می‌شود تا اصلاحات تصاویر/alt/دسته‌ها حفظ شود:
  • ۹ محصول: تصویر اختصاصی + alt دقیق + گالری هم‌تراز
  • ۲۴ دسته‌بندی: تصویر مطابق نام دسته
  • سینی dates-chocolate + گالری مجول
منبع صحت: CRO-PRODUCTION-REPORT.md بخش ۲۵.
"""
import os
import psycopg2

PRODUCTS = [
    ("mazafati-dates", "mazafati-premium", "خرمای مضافتی ممتاز بم — تیره، لطیف و مرطوب"),
    ("piaram-dates", "piaram-premium", "خرمای پیارم ممتاز حاجی‌آباد — کشیده، روشن و چین‌دار"),
    ("saffron-negin", "saffron-threads", "زعفران سرگل نگین ایرانی — رشته‌های قرمز خالص"),
    ("saffron-candy", "saffron-candy", "آبنبات زعفرانی طلایی با زعفران واقعی"),
    ("saffron-noghl", "saffron-noghl", "نقل زعفرانی — بادام با پوشش شکر و زعفران"),
    ("yalda-nuts", "nuts-yalda", "آجیل مخصوص شب یلدا با انار"),
    ("four-kernel-nuts", "nuts-four-mix", "آجیل چهارمغز ممتاز — پسته، بادام، بادام هندی و فندق"),
    ("helsa-dried-fruit-selection", "dried-fruit-mix", "خشکبار مخلوط ممتاز هلسا"),
    ("mountain-honey", "honey-mountain", "عسل کوهستان طبیعی با عسل‌کردو"),
]

CATEGORIES = {
    "آبنبات": "candy", "ادویه": "spice-blend", "ارده": "tahini",
    "بادام زمینی": "peanuts-roasted", "بار خرما": "date-bar", "بار کنجد": "sesame-bar",
    "تخمه": "sunflower-seeds", "ترشیجات": "pickles", "زرشک": "barberry",
    "زیتون": "olives-green", "حلوا ارده": "halva-arde", "پنیر": "cheese",
    "قند خرما": "date-sugar", "نبات": "rock-candy", "نقل": "noghl",
    "عرقیات": "distillate", "گل محمدی": "rosebuds", "شیره": "date-syrup",
    "روغن": "olive-oil", "حبوبات": "legumes", "خرما": "mazafati-premium",
    "دمنوش‌های ویژه هلسا": "herbal-tea", "شکلات خرما": "date-chocolate",
    "کره بادام زمینی": "peanut-butter",
}


def main():
    conn = psycopg2.connect(os.environ.get("DATABASE_URL", "postgresql://helsa:helsa_dev_pw@127.0.0.1:5432/helsa_db"))
    cur = conn.cursor()
    n = 0
    for slug, name, alt in PRODUCTS:
        path = f"/images/opt/{name}.jpg"
        cur.execute(
            "UPDATE products SET image=%s, image_alt=%s, gallery=to_jsonb(ARRAY[%s])::jsonb, updated_at=now() WHERE slug=%s",
            (path, alt, path, slug),
        )
        n += cur.rowcount
    for cname, img in CATEGORIES.items():
        cur.execute("UPDATE categories SET image=%s WHERE name=%s", (f"/images/opt/{img}.jpg", cname))
        n += cur.rowcount
    cur.execute("UPDATE mazeh_trays SET image='/images/opt/date-chocolate.jpg' WHERE slug='dates-chocolate'")
    n += cur.rowcount
    # گالری مجول: سه نمای واقعی مجول (باقی می‌ماند؛ reassign آن را نمی‌پوشاند)
    cur.execute(
        "UPDATE products SET gallery='[\"/images/opt/medjool-dates.jpg\",\"/images/opt/medjool-dates-2.jpg\",\"/images/opt/medjool-dates-3.jpg\"]'::jsonb, updated_at=now() WHERE slug='medjool-dates'"
    )
    n += cur.rowcount
    conn.commit()
    print(f"apply-image-fixes: {n} رکورد هم‌تراز شد (idempotent)")


if __name__ == "__main__":
    main()
