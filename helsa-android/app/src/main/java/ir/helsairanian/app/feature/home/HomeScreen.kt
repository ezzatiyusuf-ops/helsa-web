package ir.helsairanian.app.feature.home

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Campaign
import androidx.compose.material.icons.filled.CardGiftcard
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Storefront
import androidx.compose.material3.Icon
import androidx.compose.material.icons.filled.Dns
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.IconButton
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch
import coil.compose.AsyncImage
import ir.helsairanian.app.core.analytics.Analytics
import ir.helsairanian.app.core.data.CampaignMath
import ir.helsairanian.app.core.data.CartHolder
import ir.helsairanian.app.core.data.CatalogRepository
import ir.helsairanian.app.core.net.CampaignDto
import ir.helsairanian.app.core.net.CategoryDto
import ir.helsairanian.app.core.net.ImageUrls
import ir.helsairanian.app.core.net.NetworkModule
import ir.helsairanian.app.core.net.ProductDto
import ir.helsairanian.app.core.util.friendlyError
import ir.helsairanian.app.core.util.UiState
import ir.helsairanian.app.designsystem.CampaignCountdown
import ir.helsairanian.app.designsystem.CardProduct
import ir.helsairanian.app.designsystem.CardVariant
import ir.helsairanian.app.designsystem.HelsaPalette
import ir.helsairanian.app.designsystem.HelsaProductCard
import ir.helsairanian.app.designsystem.SectionHeader
import ir.helsairanian.app.designsystem.StockState
import ir.helsairanian.app.designsystem.stockState
import ir.helsairanian.app.navigation.Routes

/** §9 مناسبت‌ها — پیکربندی استاتیکِ همان شش لینک سایت؛ بدون هیچ فراخوانی شبکه → فوری */
data class Occasion(val title: String, val emoji: String, val cat: String?)
val OCCASIONS = listOf(
    Occasion("پذیرایی مهمان", "🍽️", "party"),
    Occasion("هدیه", "🎁", null),
    Occasion("مصرف روزانه", "🌞", "daily"),
    Occasion("مناسبت خاص", "🎉", null),
    Occasion("اداری و سازمانی", "🏢", null),
    Occasion("سینی مزه", "🧺", null),
)

data class HomeData(
    val featured: List<ProductDto> = emptyList(),
    val categories: List<CategoryDto> = emptyList(),
    val campaigns: List<CampaignDto> = emptyList(),
)

@Composable
fun HomeScreen(deepLinkRoute: String?, onOpenRoute: (String) -> Unit) {
    val context = LocalContext.current
    val api = remember { NetworkModule.api(context) }
    val repo = remember { CatalogRepository(context) }
    val cart = CartHolder.get(context)
    val scope = androidx.compose.runtime.rememberCoroutineScope()
    val analytics = remember { ir.helsairanian.app.core.analytics.HelsaAnalytics() }

    var state by remember { mutableStateOf<UiState<HomeData>>(UiState.Loading) }
    var showServerDialog by remember { mutableStateOf(false) }
    var timing by remember { mutableStateOf<CampaignMath.CampaignTiming?>(null) }
    var activeCampaign by remember { mutableStateOf<CampaignDto?>(null) }

    // هدایت App Link (§26)
    LaunchedEffect(deepLinkRoute) { deepLinkRoute?.let(onOpenRoute) }

    // §32: محتوای حیاتی خانه اول؛ کاتالوگ کامل ۱۸۴تایی اینجا لود نمی‌شود
    LaunchedEffect(Unit) {
        analytics.track(Analytics.APP_OPEN)
        state = UiState.Loading
        try {
            val featured = api.featured().items
            val categories = repo.getCategories()
            val campaigns = repo.getCampaigns()
            val t = CampaignMath.timing(campaigns)
            timing = t
            activeCampaign = campaigns.firstOrNull { it.active && CampaignMath.phase(it) == CampaignMath.Phase.ACTIVE }
            state = UiState.Ready(HomeData(featured, categories, campaigns))
        } catch (t: Throwable) {
            state = UiState.Error(friendlyError(t))
        }
    }

    val openProduct: (ProductDto) -> Unit = { onOpenRoute(Routes.product(it.slug)) }

    if (showServerDialog) {
        ServerUrlDialog(
            current = ir.helsairanian.app.core.net.ServerConfig.override ?: ir.helsairanian.app.BuildConfig.BASE_URL,
            onDismiss = { showServerDialog = false },
            onSave = { url ->
                showServerDialog = false
                scope.launch { ir.helsairanian.app.core.net.ServerConfig.save(context, url) }
            },
        )
    }

    Column(Modifier.fillMaxSize()) {
        // ── هدر HELSA + جستجو ──
        Surface(color = MaterialTheme.colorScheme.surface, shadowElevation = 1.dp) {
            Column(Modifier.padding(horizontal = 16.dp, vertical = 10.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("هلسا", style = MaterialTheme.typography.headlineSmall, color = MaterialTheme.colorScheme.primary)
                    Spacer(Modifier.width(8.dp))
                    Text("HELSA Organic Products", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.tertiary)
                    Spacer(Modifier.weight(1f))
                    if (ir.helsairanian.app.BuildConfig.DEBUG) {
                        IconButton(onClick = { showServerDialog = true }, modifier = Modifier.size(34.dp)) {
                            Icon(Icons.Filled.Dns, "تغییر آدرس سرور (بیلد تست)", tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(17.dp))
                        }
                    }
                }
                Spacer(Modifier.height(10.dp))
                Surface(
                    onClick = { onOpenRoute(Routes.SEARCH) },
                    shape = RoundedCornerShape(14.dp),
                    color = MaterialTheme.colorScheme.surfaceVariant,
                    modifier = Modifier.fillMaxWidth().height(46.dp),
                ) {
                    Row(Modifier.padding(horizontal = 14.dp), verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Filled.Search, "جستجو در هلسا", tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(19.dp))
                        Spacer(Modifier.width(8.dp))
                        Text("جستجو در هلسا…", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            }
        }

        when (val s = state) {
            is UiState.Loading -> ir.helsairanian.app.designsystem.LoadingState(Modifier.weight(1f))
            is UiState.Error -> ir.helsairanian.app.designsystem.ErrorState(s.message, { onOpenRoute(Routes.HOME) }, Modifier.weight(1f))
            is UiState.Ready -> {
                Column(Modifier.weight(1f).verticalScroll(rememberScrollState()).padding(bottom = 12.dp)) {
                    val data = s.data

                    // ── بنر کمپین فعال (اگر باشد) ──
                    activeCampaign?.let { c ->
                        Surface(
                            onClick = { analytics.track(Analytics.VIEW_CAMPAIGN); onOpenRoute(Routes.campaign(c.slug)) },
                            shape = RoundedCornerShape(18.dp),
                            color = MaterialTheme.colorScheme.primaryContainer,
                            modifier = Modifier.padding(horizontal = 16.dp, vertical = 10.dp).fillMaxWidth(),
                        ) {
                            Row(Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Filled.Campaign, null, tint = MaterialTheme.colorScheme.primary)
                                Spacer(Modifier.width(10.dp))
                                Column(Modifier.weight(1f)) {
                                    Text(c.title, style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onPrimaryContainer)
                                    if (c.discount > 0) Text("تا ٪${ir.helsairanian.app.core.util.faDigits(c.discount)} تخفیف", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onPrimaryContainer)
                                }
                            }
                        }
                    }

                    // ── دسته‌های اصلی (کش‌شده) ──
                    SectionHeader("دسته‌بندی‌های منتخب", "ویترین هلسا", Modifier.padding(horizontal = 16.dp, vertical = 10.dp))
                    LazyRow(Modifier.padding(horizontal = 16.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        items(data.categories.take(10)) { c ->
                            Surface(
                                onClick = { onOpenRoute(Routes.catalog(c.slug)) },
                                shape = RoundedCornerShape(16.dp),
                                color = MaterialTheme.colorScheme.surface,
                                border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant),
                            ) {
                                Column(Modifier.padding(10.dp).width(88.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                                    AsyncImage(
                                        model = ImageUrls.resolve(c.image),
                                        contentDescription = c.imageAlt.ifEmpty { c.name },
                                        modifier = Modifier.size(56.dp).clip(RoundedCornerShape(12.dp)),
                                    )
                                    Spacer(Modifier.height(6.dp))
                                    Text(c.name, style = MaterialTheme.typography.labelMedium, maxLines = 1)
                                }
                            }
                        }
                    }

                    // ── «برای چه مناسبتی خرید می‌کنید؟» — فوری، بدون شبکه (§9) ──
                    SectionHeader("برای چه مناسبتی خرید می‌کنید؟", "انتخاب هوشمند", Modifier.padding(horizontal = 16.dp, vertical = 12.dp))
                    LazyRow(Modifier.padding(horizontal = 16.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        items(OCCASIONS) { occ ->
                            Surface(
                                onClick = {
                                    when {
                                        occ.title == "هدیه" -> { analytics.track(Analytics.VIEW_GIFT); onOpenRoute(Routes.GIFTS) }
                                        occ.title == "سینی مزه" -> { analytics.track(Analytics.VIEW_MAZEH); onOpenRoute(Routes.MAZEH) }
                                        occ.title == "اداری و سازمانی" -> onOpenRoute(Routes.GIFTS)
                                        occ.cat != null -> onOpenRoute(Routes.catalog(occ.cat))
                                        else -> onOpenRoute("catalog")
                                    }
                                },
                                shape = RoundedCornerShape(16.dp),
                                color = HelsaPalette.GreenContainer,
                            ) {
                                Column(Modifier.padding(horizontal = 16.dp, vertical = 12.dp).width(86.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                                    Text(occ.emoji, style = MaterialTheme.typography.titleLarge)
                                    Spacer(Modifier.height(4.dp))
                                    Text(occ.title, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onPrimaryContainer, maxLines = 1)
                                }
                            }
                        }
                    }

                    // ── پیشنهاد ویژه + شمارش‌معکوس واقعی (§16) ──
                    Row(Modifier.padding(horizontal = 16.dp, vertical = 12.dp).fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                        SectionHeader("پیشنهاد ویژه امروز", "جشنوارهٔ هدیهٔ هلسا", Modifier.weight(1f))
                        timing?.takeIf { it.showCountdown }?.let {
                            CampaignCountdown(endMillis = it.endMillis)
                        }
                    }
                    LazyRow(Modifier.padding(horizontal = 16.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        items(data.featured.take(8)) { p ->
                            HelsaProductCard(
                                product = p.toCard(),
                                variant = CardVariant.Featured,
                                onOpen = { openProduct(p) },
                                onAddToCart = {
                                    analytics.track(Analytics.ADD_TO_CART, mapOf("slug" to p.slug))
                                    cart.add(p.toCartItem())
                                },
                                modifier = Modifier.width(168.dp),
                            )
                        }
                    }

                    // ── دسترسی سریع: مزه/هدیه/کمپین‌ها ──
                    Row(Modifier.padding(horizontal = 16.dp, vertical = 14.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        QuickTile("سینی مزه", "🧺") { onOpenRoute(Routes.MAZEH) }
                        QuickTile("هدایا", "🎁") { onOpenRoute(Routes.GIFTS) }
                        QuickTile("کمپین‌ها", "🏷️") { onOpenRoute(Routes.CAMPAIGNS) }
                    }

                    // ── داستان برند ──
                    Surface(
                        shape = RoundedCornerShape(18.dp),
                        color = HelsaPalette.Cream,
                        modifier = Modifier.padding(horizontal = 16.dp).fillMaxWidth(),
                    ) {
                        Column(Modifier.padding(16.dp)) {
                            Text("چرا هلسا؟", style = MaterialTheme.typography.titleMedium, color = HelsaPalette.PrimaryDark)
                            Spacer(Modifier.height(6.dp))
                            Text(
                                "هلسا تولیدکنندهٔ محصولات طبیعی ایران است — از خرما و آجیل تا سینی مزه و هدایای سازمانی. «چون شما لایق بهترین‌ها هستید…»",
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                    }
                    Spacer(Modifier.height(16.dp))
                }
            }
            UiState.Empty -> ir.helsairanian.app.designsystem.EmptyState(title = "فعلاً محتوایی نیست", modifier = Modifier.weight(1f))
        }
    }
}

@Composable
private fun androidx.compose.foundation.layout.RowScope.QuickTile(title: String, emoji: String, onClick: () -> Unit) {
    Surface(
        onClick = onClick,
        shape = RoundedCornerShape(16.dp),
        color = MaterialTheme.colorScheme.surface,
        border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant),
        modifier = Modifier.weight(1f),
    ) {
        Column(Modifier.padding(vertical = 14.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            Text(emoji, style = MaterialTheme.typography.headlineSmall)
            Spacer(Modifier.height(4.dp))
            Text(title, style = MaterialTheme.typography.labelLarge)
        }
    }
}

fun ProductDto.toCard() = CardProduct(
    key = "product:$id",
    name = name,
    image = ImageUrls.resolve(image),
    imageAlt = imageAlt,
    price = price,
    oldPrice = oldPrice,
    discount = discount,
    rating = rating,
    reviews = reviews,
    stockState = stockState(stockStatus, stock, lowStockThreshold),
    badge = badge,
)

fun ProductDto.toCartItem(qty: Int = 1) = ir.helsairanian.app.core.data.CartItem(
    key = "product:$id",
    kind = "product",
    refId = id,
    name = name,
    image = ImageUrls.resolve(image),
    unitPrice = price,
    weight = weight,
    qty = qty,
    maxQty = maxOrderQty.coerceAtLeast(1),
)


/** فقط بیلد تست: تعویض آدرس سرور بدون بیلد مجدد (وقتی تونل تست عوض می‌شود) */
@Composable
fun ServerUrlDialog(current: String, onDismiss: () -> Unit, onSave: (String?) -> Unit) {
    var text by remember { mutableStateOf(current) }
    androidx.compose.material3.AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("آدرس سرور — فقط بیلد تست") },
        text = {
            Column {
                Text("اگر اپ «بدون اتصال» شد یعنی تونل تست عوض شده؛ آدرس تازه را اینجا بچسبانید. پس از ذخیره، اپ را ببندید و دوباره باز کنید.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Spacer(Modifier.height(10.dp))
                OutlinedTextField(
                    value = text,
                    onValueChange = { text = it },
                    label = { Text("https://…trycloudflare.com") },
                    singleLine = true,
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.fillMaxWidth(),
                )
            }
        },
        confirmButton = { Button(onClick = { onSave(text) }) { Text("ذخیره") } },
        dismissButton = { androidx.compose.material3.TextButton(onClick = onDismiss) { Text("انصراف") } },
    )
}
