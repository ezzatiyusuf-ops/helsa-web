# UI/UX Audit Final — HELSA

## Principle
**The same HELSA — but better.** No full redesign. Preserve Luxury Minimal Iranian identity.

## Visual inventory

| Component | Verdict | Notes |
|---|---|---|
| Header + mega menu + RTL drawer | KEEP / IMPROVE | Preserved structure; mobile/tablet density cleaned |
| Hero | KEEP | Brand message, photography, CTAs intact |
| ProductCard | KEEP / IMPROVE | Same language; better touch targets and real availability |
| ProductsExplorer | KEEP / IMPROVE | Compact filters, real categories, better mobile toolbar |
| Product detail | IMPROVE | Real category name, RTL breadcrumb, variant-aware sticky price |
| TrayCard / TrayExplorer / Tray detail | KEEP / IMPROVE | Same visual DNA; stock-aware CTA |
| Cart | KEEP / IMPROVE | Same layout; stronger summary hierarchy |
| Checkout | KEEP | Trust-first, calm flow preserved |
| AuthPanel | KEEP / IMPROVE | Forgot-password link restored |
| Account dashboard | KEEP | Premium customer area preserved |
| About / Contact | KEEP | Storytelling pages preserved |
| Footer / Support | KEEP | Brand footer and concierge preserved |
| Admin | KEEP | Operational, not storefront-luxury (by design) |

## Page-by-page improvements (this pass)

### Homepage
- Featured products and selected categories now come from catalog service/DB.
- Fallback empty state if no curated products exist.
- Mazeh section CTA pair clarified without redesign.

### Product detail
- Breadcrumb uses Persian chevrons and semantic list markup.
- Category label uses real Persian category name from DB.
- Sticky mobile price follows selected variant.
- Related / recently viewed use HELSA `SectionHead` rhythm.

### Cart
- Summary card gains HELSA gold eyebrow and soft lift while keeping existing structure.

### Auth
- “رمز عبور را فراموش کرده‌اید؟” now links to `/forgot-password`.

### Tray detail
- Stock/availability from DB drives CTA and quantity max.

## Consistency checks
- Same tokens: `brand`, `gold`, `surface`, `line`, `canvas`, `text-price`
- Same radius language: rounded-2xl cards, rounded-full CTAs
- Same Persian RTL chevron breadcrumb pattern
- Same Vazirmatn + HELSA green/gold identity

## Not changed on purpose
- Header architecture
- Hero photography concept
- Product card silhouette
- Mazeh signature experience
- Dark palette philosophy
- Checkout step model
