package ir.helsairanian.app.feature.product

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Remove
import androidx.compose.material.icons.filled.ShoppingCart
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import ir.helsairanian.app.core.analytics.Analytics
import ir.helsairanian.app.core.analytics.HelsaAnalytics
import ir.helsairanian.app.core.data.CartHolder
import ir.helsairanian.app.core.net.NetworkModule
import ir.helsairanian.app.core.net.ProductDto
import ir.helsairanian.app.core.util.UiState
import ir.helsairanian.app.core.util.faDigits
import ir.helsairanian.app.core.util.friendlyError
import ir.helsairanian.app.designsystem.CardVariant
import ir.helsairanian.app.designsystem.ErrorState
import ir.helsairanian.app.designsystem.HelsaProductCard
import ir.helsairanian.app.designsystem.LoadingState
import ir.helsairanian.app.designsystem.PriceText
import ir.helsairanian.app.designsystem.SectionHeader
import ir.helsairanian.app.designsystem.StockState
import ir.helsairanian.app.designsystem.stockState
import ir.helsairanian.app.feature.home.toCard
import ir.helsairanian.app.feature.home.toCartItem

/** §13 جزئیات محصول — همهٔ داده از سرور؛ قیمت هرگز از کلاینت authoritative نیست */
@Composable
fun ProductDetailScreen(slug: String, onBack: () -> Unit, onOpenProduct: (String) -> Unit) {
    val context = LocalContext.current
    val api = remember { NetworkModule.api(context) }
    val cart = CartHolder.get(context)
    val analytics = remember { HelsaAnalytics() }

    var state by remember { mutableStateOf<UiState<Pair<ProductDto, List<ProductDto>>>>(UiState.Loading) }
    var qty by remember { mutableIntStateOf(1) }

    LaunchedEffect(slug) {
        state = UiState.Loading
        try {
            val res = api.productBySlug(slug)
            val p = res.product
            if (p == null) state = UiState.Error("این محصول پیدا نشد.")
            else {
                analytics.track(Analytics.VIEW_PRODUCT, mapOf("slug" to slug))
                state = UiState.Ready(p to res.related)
            }
        } catch (t: Throwable) { state = UiState.Error(friendlyError(t)) }
    }

    Column(Modifier.fillMaxSize()) {
        when (val s = state) {
            is UiState.Loading -> LoadingState(Modifier.weight(1f))
            is UiState.Error -> ErrorState(s.message, onBack, Modifier.weight(1f))
            UiState.Empty -> LoadingState(Modifier.weight(1f))
            is UiState.Ready -> {
                val (p, related) = s.data
                val stock = stockState(p.stockStatus, p.stock, p.lowStockThreshold)

                Column(Modifier.weight(1f).verticalScroll(rememberScrollState())) {
                    // ── گالری اسلایدی + دکمهٔ بازگشت ──
                    Box {
                        val gallery = (listOf(p.image) + p.gallery).filter { it.isNotBlank() }.distinct().map { ir.helsairanian.app.core.net.ImageUrls.resolve(it) }
                        val pagerState = rememberPagerState { gallery.size }
                        HorizontalPager(state = pagerState, modifier = Modifier.fillMaxWidth().height(340.dp)) { i ->
                            AsyncImage(
                                model = gallery[i],
                                contentDescription = p.imageAlt.ifEmpty { p.name },
                                contentScale = ContentScale.Crop,
                                modifier = Modifier.fillMaxSize(),
                            )
                        }
                        IconButton(
                            onClick = onBack,
                            modifier = Modifier.padding(6.dp).background(Color.Black.copy(alpha = 0.35f), CircleShape),
                        ) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "بازگشت", tint = Color.White) }
                        if (gallery.size > 1) {
                            Row(
                                Modifier.align(Alignment.BottomCenter).padding(8.dp),
                                horizontalArrangement = Arrangement.spacedBy(5.dp),
                            ) {
                                repeat(gallery.size) { i ->
                                    Box(
                                        Modifier.size(if (i == pagerState.currentPage) 16.dp else 7.dp, 7.dp)
                                            .clip(CircleShape)
                                            .background(if (i == pagerState.currentPage) Color.White else Color.White.copy(alpha = 0.5f))
                                    )
                                }
                            }
                        }
                    }

                    Column(Modifier.padding(16.dp)) {
                        Text(p.name, style = MaterialTheme.typography.headlineSmall)
                        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(top = 4.dp)) {
                            Icon(Icons.Filled.Star, null, tint = MaterialTheme.colorScheme.tertiary, modifier = Modifier.size(15.dp))
                            Spacer(Modifier.width(4.dp))
                            Text("${faDigits(p.rating)} از ۵ (${faDigits(p.reviews)} نظر)", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            Spacer(Modifier.width(10.dp))
                            Surface(
                                shape = RoundedCornerShape(8.dp),
                                color = when (stock) {
                                    StockState.OUT_OF_STOCK -> MaterialTheme.colorScheme.errorContainer
                                    StockState.LOW_STOCK -> MaterialTheme.colorScheme.tertiaryContainer
                                    StockState.IN_STOCK -> MaterialTheme.colorScheme.primaryContainer
                                },
                            ) {
                                Text(
                                    when (stock) {
                                        StockState.OUT_OF_STOCK -> "ناموجود"
                                        StockState.LOW_STOCK -> "فقط ${faDigits(p.stock)} عدد باقی مانده"
                                        StockState.IN_STOCK -> "موجود"
                                    },
                                    style = MaterialTheme.typography.labelSmall,
                                    color = MaterialTheme.colorScheme.onSurface,
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp),
                                )
                            }
                        }

                        Spacer(Modifier.height(12.dp))
                        PriceText(price = p.price, oldPrice = p.oldPrice, large = true)

                        if (p.shortDescription.isNotBlank()) {
                            Spacer(Modifier.height(10.dp))
                            Text(p.shortDescription, style = MaterialTheme.typography.bodyLarge, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }

                        // ── انتخاب تعداد + افزودن ──
                        Spacer(Modifier.height(16.dp))
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                            Surface(shape = RoundedCornerShape(12.dp), border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outline)) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    IconButton(onClick = { if (qty > p.minOrderQty) qty-- }, enabled = qty > p.minOrderQty) { Icon(Icons.Filled.Remove, "کاهش") }
                                    Text(faDigits(qty), style = MaterialTheme.typography.titleMedium)
                                    IconButton(onClick = { if (qty < p.maxOrderQty) qty++ }, enabled = qty < p.maxOrderQty) { Icon(Icons.Filled.Add, "افزایش") }
                                }
                            }
                            Button(
                                onClick = {
                                    analytics.track(Analytics.ADD_TO_CART, mapOf("slug" to p.slug, "qty" to qty))
                                    cart.add(p.toCartItem(qty))
                                },
                                enabled = stock != StockState.OUT_OF_STOCK,
                                shape = RoundedCornerShape(12.dp),
                                colors = ButtonDefaults.buttonColors(),
                                modifier = Modifier.weight(1f).height(48.dp),
                            ) {
                                Icon(Icons.Filled.ShoppingCart, null)
                                Spacer(Modifier.width(8.dp))
                                Text("افزودن به سبد")
                            }
                        }
                        OutlinedButton(
                            onClick = {
                                analytics.track(Analytics.BEGIN_CHECKOUT, mapOf("slug" to p.slug))
                                cart.add(p.toCartItem(qty))
                            },
                            enabled = stock != StockState.OUT_OF_STOCK,
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier.fillMaxWidth().height(46.dp).padding(top = 8.dp),
                        ) { Text("خرید سریع") }

                        // ── توضیحات ──
                        if (p.description.isNotBlank()) {
                            Spacer(Modifier.height(18.dp))
                            SectionHeader("توضیحات")
                            Spacer(Modifier.height(6.dp))
                            Text(p.description, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }

                        // ── مشخصات (features از سرور) ──
                        if (p.features.isNotEmpty()) {
                            Spacer(Modifier.height(18.dp))
                            SectionHeader("مشخصات")
                            Spacer(Modifier.height(8.dp))
                            p.features.forEach { f ->
                                Row(Modifier.fillMaxWidth().padding(vertical = 5.dp)) {
                                    Text(f.label, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.width(110.dp))
                                    Text(f.value, style = MaterialTheme.typography.bodyMedium)
                                }
                                androidx.compose.material3.HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))
                            }
                        }

                        // ── مواد اولیه/الرژن ──
                        if (p.ingredients.isNotBlank()) {
                            Spacer(Modifier.height(16.dp))
                            SectionHeader("مواد اولیه")
                            Spacer(Modifier.height(4.dp))
                            Text(p.ingredients, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                        if (p.allergens.isNotEmpty()) {
                            Spacer(Modifier.height(8.dp))
                            Text("⚠️ آلرژن‌ها: ${p.allergens.joinToString("، ")}", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.error)
                        }

                        // ── مرتبط‌ها (همان کارت واحد) ──
                        if (related.isNotEmpty()) {
                            Spacer(Modifier.height(18.dp))
                            SectionHeader("محصولات مرتبط", "شاید بپسندید")
                            Spacer(Modifier.height(10.dp))
                            LazyRow(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                                items(related.take(6)) { r ->
                                    HelsaProductCard(
                                        product = r.toCard(),
                                        variant = CardVariant.Featured,
                                        onOpen = { onOpenProduct(r.slug) },
                                        onAddToCart = { cart.add(r.toCartItem()) },
                                        modifier = Modifier.width(168.dp),
                                    )
                                }
                            }
                        }
                        Spacer(Modifier.height(24.dp))
                    }
                }
            }
        }
    }
}
