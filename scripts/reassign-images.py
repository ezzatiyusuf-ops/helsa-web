#!/usr/bin/env python3
"""HELSA — reassign type-appropriate images to products that shared placeholder photos.
Idempotent: only touches products still pointing at the old shared image.
Run: python3 scripts/reassign-images.py [--dry]
"""
import json
import os
import sys
import psycopg2

# نقشهٔ کامل: slug محصول → نام تصویر جدید در /images/opt/{name}.jpg
PLAN = {
    # ── بستهٔ ۱: حبوبات/نبات/زرشک (تصاویر آماده) ──
    "mung-beans": "mung-beans",
    "split-peas": "split-peas",
    "lentils": "lentils",
    "chickpeas": "chickpeas",
    "red-beans": "red-beans",
    "pinto-beans": "pinto-beans",
    "roasted-chickpeas": "roasted-chickpeas",
    "saffron-rock-candy": "saffron-rock-candy",
    "plain-rock-candy": "rock-candy",
    "stick-rock-candy": "rock-candy",
    "branch-rock-candy": "rock-candy",
    "helsa-rock-candy": "rock-candy",
    "puffy-barberry": "barberry",
    "pomegranate-barberry": "barberry",
    "helsa-premium-barberry": "barberry",
    # ── بستهٔ ۲ (پس از تولید تصاویر) ──
    "plain-candy": "candy", "saffron-candy": "saffron-candy", "fruit-candy": "candy", "filled-candy": "candy", "helsa-candy": "candy",
    "bidmeshk-noghl": "noghl", "plain-noghl": "noghl", "saffron-noghl": "saffron-noghl", "filled-noghl": "noghl", "helsa-noghl": "noghl",
    "olive-oil": "olive-oil", "extra-virgin-olive-oil": "olive-oil", "sesame-oil": "sesame-oil", "helsa-sesame-oil": "sesame-oil",
    "raw-peanuts": "peanuts-raw", "salted-peanuts": "peanuts-roasted", "roasted-peanuts": "peanuts-roasted", "flavored-peanuts": "peanuts-roasted",
    "plain-halva-tahini": "halva-arde", "pistachio-halva-tahini": "halva-arde", "helsa-halva-tahini": "halva-arde",
    "plain-peanut-butter": "peanut-butter", "crunchy-peanut-butter": "peanut-butter", "chocolate-peanut-butter": "peanut-butter", "helsa-peanut-butter": "peanut-butter",
    "sesame-bar": "sesame-bar", "sesame-date-bar": "sesame-bar", "sesame-nut-bar": "sesame-bar", "helsa-sesame-bar": "sesame-bar",
    # ── بستهٔ ۳: ادویه ──
    "sumac": "sumac", "sumac-flakes": "sumac",
    "helsa-spice-blend": "spice-blend", "rice-spice": "spice-blend", "stew-spice": "spice-blend", "chicken-spice": "spice-blend", "meat-spice": "spice-blend", "mixed-spices": "spice-blend",
    "black-pepper": "black-pepper", "red-pepper": "red-pepper", "turmeric": "turmeric", "cinnamon": "cinnamon", "golpar": "golpar",
    # ── بستهٔ ۴: عرقیات/دمنوش ──
    "mint-distillate": "distillate", "chicory-distillate": "distillate", "orange-blossom-distillate": "distillate", "rose-distillate": "distillate", "bidmeshk-distillate": "distillate", "fumitory-distillate": "distillate", "fennel-distillate": "distillate",
    "rose-herbal-tea": "herbal-tea", "orange-blossom-tea": "herbal-tea", "calm-herbal-tea": "herbal-tea", "helsa-herbal-blend": "herbal-tea", "hospitality-herbal-tea": "herbal-tea",
    # herbal-tea-borge: slug تایپویی حذف شد؛ herbal-tea-borage تصویر اختصاصی خودش را دارد (96) — انتقال تنزل است
    "helsa-fruit-tea": "fruit-tea",
    "sumac-flakes": "sumac-flakes",  # نوبت ۴: تصویر اختصاصی (دستهٔ natural بدون family-map)
    "rosebuds": "rosebuds", "dried-rose": "rosebuds", "helsa-rosebuds": "rosebuds",
    # ── بستهٔ ۵: پنیر/زیتون/ترشی ──
    "hospitality-cheese": "cheese", "traditional-cheese": "cheese", "helsa-cheese": "cheese",
    "green-olives": "olives-green", "helsa-olives": "olives-green", "pitted-olives": "olives-green",
    "black-olives": "olives-black", "marinated-olives": "olives-black",
    "mixed-pickles": "pickles", "liteh-pickles": "pickles", "garlic-pickles": "pickles", "helsa-pickles": "pickles",
    # ── بستهٔ ۶: تخمه‌ها ──
    "pumpkin-seeds": "pumpkin-seeds", "meaty-pumpkin-seeds": "pumpkin-seeds",
    "sunflower-seeds": "sunflower-seeds", "salted-seeds": "sunflower-seeds", "roasted-seeds": "sunflower-seeds", "helsa-flavored-seeds": "sunflower-seeds",
    "japanese-seeds": "sunflower-seeds",
    "watermelon-seeds": "watermelon-seeds",
    # ── بستهٔ ۷: عسل/شیره/ارده ──
    "natural-honey": "honey-jar", "sidr-honey": "honey-jar", "orange-blossom-honey": "honey-jar", "khalilo-honey": "honey-jar", "mountain-honey": "honey-mountain", "helsa-signature-honey": "honey-jar",
    "date-syrup": "date-syrup", "grape-syrup": "grape-syrup", "mulberry-syrup": "mulberry-syrup", "helsa-signature-syrup": "date-syrup",
    "sesame-tahini": "tahini", "traditional-tahini": "tahini", "helsa-tahini": "tahini",
    # ── بستهٔ ۸: شکلات/بیسکویت/کیک ──
    "milk-chocolate": "chocolate-assorted", "dark-chocolate": "chocolate-assorted", "filled-chocolate": "chocolate-assorted", "helsa-handmade-chocolate": "chocolate-assorted", "helsa-signature-chocolate": "chocolate-assorted", "hospitality-chocolate": "chocolate-assorted",
    "date-chocolate": "date-chocolate", "filled-date-chocolate": "date-chocolate", "coconut-date-chocolate": "date-chocolate", "sesame-date-chocolate": "date-chocolate", "helsa-signature-date-chocolate": "date-chocolate",
    "helsa-hospitality-biscuits": "biscuits", "date-biscuits": "biscuits",
    "helsa-date-cake": "date-cake", "helsa-dry-cake": "date-cake", "helsa-dry-sweets": "biscuits",
    # ── بستهٔ ۹: ارقام خرما/بار/قند ──
    "mazafati-dates": "mazafati-premium", "kabkab-dates": "dates-kabkab", "khasoei-dates": "dates-khasoei", "piaram-dates": "piaram-premium", "zahedi-dates": "dates-zahedi",
    # جلسهٔ ۲۲ — تصاویر اختصاصی جدید
    "saffron-negin": "saffron-threads", "yalda-nuts": "nuts-yalda", "four-kernel-nuts": "nuts-four-mix", "helsa-dried-fruit-selection": "dried-fruit-mix",
    "date-bar": "date-bar", "helsa-date-bar": "date-bar", "date-nut-bar": "date-bar", "date-sesame-bar": "date-bar", "date-chocolate-bar": "date-bar",
    "date-sugar": "date-sugar", "helsa-date-sugar": "date-sugar",
    # ── بستهٔ ۱۰: متفرقه ──
    "walnut-kernels": "walnut-kernels",
    "helsa-gift-pack": "gift-pack", "helsa-hospitality-pack": "gift-pack", "helsa-breakfast-pack": "gift-pack", "helsa-nowruz-pack": "gift-pack", "helsa-yalda-pack": "gift-pack", "helsa-corporate-pack": "gift-pack", "helsa-party-pack": "gift-pack",
}

def main():
    dry = "--dry" in sys.argv
    conn = psycopg2.connect(os.environ.get("DATABASE_URL", "postgresql://helsa:helsa_dev_pw@127.0.0.1:5432/helsa_db"))
    cur = conn.cursor()
    applied, skipped = 0, []
    for slug, name in PLAN.items():
        path = f"/images/opt/{name}.jpg"
        cur.execute("SELECT image FROM products WHERE slug=%s", (slug,))
        row = cur.fetchone()
        if not row:
            skipped.append((slug, "not-found"))
            continue
        if not os.path.exists(f"public/images/opt/{name}.jpg") and not os.path.exists(f"public/{path}"):
            skipped.append((slug, "image-missing"))
            continue
        if row[0] == path:
            continue  # قبلاً اعمال شده
        if dry:
            print(f"[dry] {slug}: {row[0]} → {path}")
            applied += 1
            continue
        cur.execute(
            "UPDATE products SET image=%s, gallery=to_jsonb(ARRAY[%s])::jsonb, updated_at=now() WHERE slug=%s AND (gallery IS NULL OR jsonb_array_length(gallery) < 2)",
            (path, path, slug),
        )
        applied += 1
    conn.commit()
    missing = [s for s, r in skipped if r == "image-missing"]
    notfound = [s for s, r in skipped if r == "not-found"]
    print(f"reassigned: {applied} | image-missing (منتظر تولید): {len(missing)} | not-found: {notfound}")
    if missing:
        print("slugs pending images:", " ".join(missing))

main()
