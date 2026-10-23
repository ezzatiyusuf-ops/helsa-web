package ir.helsairanian.app.designsystem

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.outlined.RemoveShoppingCart
import androidx.compose.material.icons.filled.LocalShipping
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import ir.helsairanian.app.core.util.faDigits
import ir.helsairanian.app.core.util.faPrice

/**
 * §12 سیستم کارت واحد — HelsaProductCard.
 * همهٔ بخش‌های اپ (خانه/کاتالوگ/جستجو/مرتبط) از همین پوسته استفاده می‌کنند:
 * تصویر مربع ۱:۱ · بج‌ها روی گوشهٔ تصویر · سلسله‌مراتب عنوان یکسان · Price مشترک · CTA یکسان.
 * variant=Featured فقط عرض/چیدمان را تغییر می‌دهد — پایهٔ بصری ثابت می‌ماند.
 */

enum class StockState { IN_STOCK, LOW_STOCK, OUT_OF_STOCK }

fun stockState(status: String, stock: Int, threshold: Int = 3): StockState = when {
    stock <= 0 -> StockState.OUT_OF_STOCK
    status == "low_stock" || stock <= threshold -> StockState.LOW_STOCK
    else -> StockState.IN_STOCK
}

data class CardProduct(
    val key: String,
    val name: String,
    val image: String,
    val imageAlt: String,
    val price: Int,
    val oldPrice: Int?,
    val discount: Int,
    val rating: Double,
    val reviews: Int,
    val stockState: StockState,
    val badge: String? = null,
)

@Composable
fun HelsaProductCard(
    product: CardProduct,
    variant: CardVariant = CardVariant.Standard,
    onOpen: () -> Unit,
    onAddToCart: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val shape = RoundedCornerShape(20.dp)
    Surface(
        onClick = onOpen,
        shape = shape,
        color = MaterialTheme.colorScheme.surface,
        tonalElevation = 0.dp,
        shadowElevation = 1.dp,
        border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant),
        modifier = modifier.fillMaxWidth(),
    ) {
        Column(Modifier.padding(10.dp)) {
            // ── تصویر مربع ۱:۱ + بج‌های گوشه (همان ساختار prem-card سایت) ──
            Box(
                Modifier
                    .fillMaxWidth()
                    .aspectRatio(1f)
                    .clip(RoundedCornerShape(14.dp))
                    .background(MaterialTheme.colorScheme.surfaceVariant)
            ) {
                AsyncImage(
                    model = product.image,
                    contentDescription = product.imageAlt.ifEmpty { product.name },
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.fillMaxSize(),
                )
                // بج تخفیف — بالا-شروع (RTL)
                if (product.discount > 0) {
                    Surface(
                        color = HelsaPalette.Accent,
                        contentColor = Color.White,
                        shape = RoundedCornerShape(10.dp),
                        modifier = Modifier.align(Alignment.TopStart).padding(8.dp),
                    ) {
                        Text(
                            "٪${faDigits(product.discount)}",
                            style = MaterialTheme.typography.labelSmall,
                            modifier = Modifier.padding(horizontal = 7.dp, vertical = 3.dp),
                        )
                    }
                }
                // بج برند/وضعیت — بالا-پایان
                product.badge?.let { b ->
                    Surface(
                        color = MaterialTheme.colorScheme.primary,
                        contentColor = Color.White,
                        shape = RoundedCornerShape(10.dp),
                        modifier = Modifier.align(Alignment.TopEnd).padding(8.dp),
                    ) {
                        Text(b, style = MaterialTheme.typography.labelSmall, modifier = Modifier.padding(horizontal = 7.dp, vertical = 3.dp))
                    }
                }
                if (product.stockState == StockState.OUT_OF_STOCK) {
                    Box(
                        Modifier.fillMaxSize().background(Color.Black.copy(alpha = 0.45f)),
                        contentAlignment = Alignment.Center,
                    ) {
                        Surface(color = Color.White, shape = RoundedCornerShape(12.dp)) {
                            Text(
                                "ناموجود",
                                style = MaterialTheme.typography.labelMedium,
                                color = HelsaPalette.PrimaryDark,
                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                            )
                        }
                    }
                }
            }
            Spacer(Modifier.height(8.dp))
            // ── عنوان (یکسان در همهٔ variantها) ──
            Text(
                product.name,
                style = MaterialTheme.typography.titleSmall,
                color = MaterialTheme.colorScheme.onSurface,
                maxLines = if (variant == CardVariant.Featured) 2 else 1,
                overflow = TextOverflow.Ellipsis,
            )
            // ── توصیف کوتاه/امتیاز ──
            if (variant == CardVariant.Featured) {
                Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(top = 2.dp)) {
                    Icon(Icons.Filled.Star, null, tint = HelsaPalette.Gold, modifier = Modifier.size(13.dp))
                    Spacer(Modifier.width(3.dp))
                    Text(
                        "${faDigits(product.rating)} (${faDigits(product.reviews)})",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
            Spacer(Modifier.height(6.dp))
            // ── قیمت (تایپوگرافی واحد) ──
            PriceText(price = product.price, oldPrice = product.oldPrice)
            Spacer(Modifier.height(8.dp))
            // ── CTA یکسان h-40 ──
            Button(
                onClick = onAddToCart,
                enabled = product.stockState != StockState.OUT_OF_STOCK,
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary),
                contentPadding = androidx.compose.foundation.layout.PaddingValues(horizontal = 12.dp),
                modifier = Modifier.fillMaxWidth().height(40.dp),
            ) {
                if (product.stockState == StockState.OUT_OF_STOCK) {
                    Icon(Icons.Outlined.RemoveShoppingCart, null, modifier = Modifier.size(16.dp))
                    Spacer(Modifier.width(6.dp))
                    Text("ناموجود", style = MaterialTheme.typography.labelLarge)
                } else {
                    Icon(Icons.Filled.Add, null, modifier = Modifier.size(16.dp))
                    Spacer(Modifier.width(6.dp))
                    Text("افزودن به سبد", style = MaterialTheme.typography.labelLarge)
                }
            }
        }
    }
}

enum class CardVariant { Standard, Featured }

/** قیمت تومان — واحد پولی یکسان در کل اپ؛ ارقام فارسی */
@Composable
fun PriceText(price: Int, oldPrice: Int?, modifier: Modifier = Modifier, large: Boolean = false) {
    Row(verticalAlignment = Alignment.Bottom, modifier = modifier) {
        Text(
            faPrice(price),
            style = if (large) MaterialTheme.typography.headlineSmall else MaterialTheme.typography.titleMedium,
            color = MaterialTheme.colorScheme.onSurface,
        )
        Spacer(Modifier.width(4.dp))
        Text("تومان", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(bottom = 3.dp))
        oldPrice?.takeIf { it > price }?.let {
            Spacer(Modifier.width(6.dp))
            Text(
                faPrice(it),
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                textDecoration = androidx.compose.ui.text.style.TextDecoration.LineThrough,
                modifier = Modifier.padding(bottom = 2.dp),
            )
        }
    }
}

/** §۵/§۱۶ شمارش‌معکوس — فقط از مهر زمانی پایانِ واقعیِ کمپین سرور؛ سقف ۲۳:۵۹:۵۹ */
@Composable
fun CampaignCountdown(endMillis: Long, modifier: Modifier = Modifier) {
    val remaining = (endMillis - System.currentTimeMillis()).coerceAtLeast(0)
    if (remaining > 24 * 60 * 60 * 1000L) return // هرگز بیش از ۲۴ ساعت نمایش داده نمی‌شود
    val h = remaining / 3_600_000
    val m = (remaining % 3_600_000) / 60_000
    val s = (remaining % 60_000) / 1000
    Surface(
        color = HelsaPalette.GoldContainer,
        contentColor = HelsaPalette.PrimaryDark,
        shape = RoundedCornerShape(14.dp),
        modifier = modifier,
    ) {
        Row(Modifier.padding(horizontal = 12.dp, vertical = 8.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            Icon(Icons.Filled.LocalShipping, null, modifier = Modifier.size(14.dp), tint = HelsaPalette.Gold)
            Text(
                "تا پایان جشنواره: ${faDigits("%02d:%02d:%02d".format(h, m, s))}",
                style = MaterialTheme.typography.labelMedium,
            )
        }
    }
}

/** سرصفحهٔ بخش — همسان با SectionHead سایت */
@Composable
fun SectionHeader(title: String, eyebrow: String? = null, modifier: Modifier = Modifier) {
    Column(modifier.fillMaxWidth()) {
        eyebrow?.let {
            Text(it, style = MaterialTheme.typography.labelMedium, color = HelsaPalette.Gold)
            Spacer(Modifier.height(2.dp))
        }
        Text(title, style = MaterialTheme.typography.titleLarge, color = MaterialTheme.colorScheme.onBackground)
    }
}

@Composable
fun LoadingState(modifier: Modifier = Modifier, label: String = "در حال بارگذاری…") {
    Box(modifier.fillMaxWidth().padding(28.dp), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            CircularProgressIndicator(color = MaterialTheme.colorScheme.primary, strokeWidth = 3.dp, modifier = Modifier.size(34.dp))
            Spacer(Modifier.height(10.dp))
            Text(label, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

@Composable
fun EmptyState(title: String, subtitle: String? = null, modifier: Modifier = Modifier) {
    Box(modifier.fillMaxWidth().padding(28.dp), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text(title, style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onSurface)
            subtitle?.let {
                Spacer(Modifier.height(4.dp))
                Text(it, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
    }
}

@Composable
fun ErrorState(message: String, onRetry: (() -> Unit)? = null, modifier: Modifier = Modifier) {
    Box(modifier.fillMaxWidth().padding(28.dp), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text("🌱", style = MaterialTheme.typography.headlineMedium)
            Spacer(Modifier.height(8.dp))
            Text(message, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurface)
            onRetry?.let {
                Spacer(Modifier.height(12.dp))
                Button(onClick = it, shape = RoundedCornerShape(12.dp)) { Text("تلاش دوباره") }
            }
        }
    }
}
