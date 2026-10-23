# verify-images.ps1 — راستی‌آزمایی کامل تصاویر پروژهٔ هلسا قبل از push
# اجرا: PowerShell را در پوشهٔ ریشهٔ پروژه باز کنید و بزنید:  .\scripts\verify-images.ps1
$ErrorActionPreference = "Stop"
$root = (Get-Item $MyInvocation.MyCommand.Path).Directory.Parent.FullName
$manifestPath = Join-Path $root "src\data\image-variants.json"
if (!(Test-Path $manifestPath)) { Write-Host "خطا: src\data\image-variants.json پیدا نشد" -ForegroundColor Red; exit 1 }
$manifest = Get-Content $manifestPath -Raw -Encoding UTF8 | ConvertFrom-Json
$opt = Join-Path $root "public\images\opt"
$missing = @()
$total = 0
foreach ($name in $manifest.PSObject.Properties.Name) {
  $v = $manifest.$name
  if ($v.jpg) {
    $total++
    if (!(Test-Path (Join-Path $opt "$name.jpg"))) { $missing += "$name.jpg" }
  }
  foreach ($ext in @("avif", "webp")) {
    foreach ($w in $v.$ext) {
      $file = if ([int]$w -eq 0) { "$name.$ext" } else { "$name-$w.$ext" }
      $total++
      if (!(Test-Path (Join-Path $opt $file))) { $missing += $file }
    }
  }
}
# تصاویر ریشهٔ public/images (هیرو/og و...)
foreach ($f in @("chocolate-craft.jpg","hero-helsa.jpg","hero-light.jpg","mazeh-board.jpg","mazeh-light.jpg","og-default.jpg","story-grove.jpg","tray-classic.jpg")) {
  $total++
  if (!(Test-Path (Join-Path $root "public\images\$f"))) { $missing += "images\$f" }
}
Write-Host "──────────────────────────────────────"
Write-Host "کل فایل‌های تصویر موردنیاز: $total"
if ($missing.Count -eq 0) {
  Write-Host "OK — همهٔ تصاویر کامل است؛ آمادهٔ git push" -ForegroundColor Green
} else {
  $missing | Set-Content (Join-Path $root "missing-images.txt") -Encoding UTF8
  Write-Host "کمبود: $($missing.Count) فایل — لیست در missing-images.txt (این لیست را برای من بفرستید)" -ForegroundColor Red
}
