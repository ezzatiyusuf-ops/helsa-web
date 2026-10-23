package ir.helsairanian.app.feature.mazeh

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Remove
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Button
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
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
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import ir.helsairanian.app.core.analytics.Analytics
import ir.helsairanian.app.core.analytics.HelsaAnalytics
import ir.helsairanian.app.core.data.CartHolder
import ir.helsairanian.app.core.data.CartItem
import ir.helsairanian.app.core.data.CatalogRepository
import ir.helsairanian.app.core.net.TrayDto
import ir.helsairanian.app.core.util.UiState
import ir.helsairanian.app.core.util.faDigits
import ir.helsairanian.app.core.util.faPrice
import ir.helsairanian.app.core.util.friendlyError
import ir.helsairanian.app.designsystem.EmptyState
import ir.helsairanian.app.designsystem.ErrorState
import ir.helsairanian.app.designsystem.LoadingState
import ir.helsairanian.app.designsystem.PriceText

/** §18 سینی مزه — تجربهٔ اختصاصی موبایل؛ داده از همان API سایت */
@Composable
fun MazehScreen(onOpen: (String) -> Unit) {
    val context = LocalContext.current
    val repo = remember { CatalogRepository(context) }
    val analytics = remember { HelsaAnalytics() }
    var state by remember { mutableStateOf<UiState<List<TrayDto>>>(UiState.Loading) }

    LaunchedEffect(Unit) {
        analytics.track(Analytics.VIEW_MAZEH)
        try {
            val list = repo.getTrays()
            state = if (list.isEmpty()) UiState.Empty else UiState.Ready(list)
        } catch (t: Throwable) { state = UiState.Error(friendlyError(t)) }
    }

    LazyColumn(Modifier.fillMaxSize().padding(16.dp), contentPadding = PaddingValues(bottom = 16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item {
            Text("سینی مزهٔ هلسا", style = MaterialTheme.typography.headlineSmall)
            Text("پذیرایی حرفه‌ای برای مهمان‌های خاص", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        when (val s = state) {
            is UiState.Loading -> item { LoadingState() }
            is UiState.Error -> item { ErrorState(s.message) }
            UiState.Empty -> item { EmptyState("فعلاً سینی فعالی ثبت نشده") }
            is UiState.Ready -> items(s.data, key = { it.id }) { t ->
                TrayRow(t, onOpen)
            }
        }
    }
}

@Composable
private fun TrayRow(t: TrayDto, onOpen: (String) -> Unit) {
    Surface(onClick = { onOpen(t.slug) }, shape = RoundedCornerShape(18.dp), border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant)) {
        Row(Modifier.padding(12.dp)) {
            AsyncImage(
                model = ir.helsairanian.app.core.net.ImageUrls.resolve(t.image),
                contentDescription = t.imageAlt.ifEmpty { t.name },
                contentScale = ContentScale.Crop,
                modifier = Modifier.height(96.dp).aspectRatio(1f).clip(RoundedCornerShape(14.dp)),
            )
            Spacer(Modifier.padding(4.dp))
            Column(Modifier.weight(1f)) {
                Text(t.name, style = MaterialTheme.typography.titleMedium)
                Text(
                    "برای ${faDigits(t.servesMin)} تا ${faDigits(t.servesMax)} نفر · ${faDigits(t.contents.size)} قلم",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Spacer(Modifier.height(6.dp))
                PriceText(price = t.basePrice, oldPrice = t.oldPrice)
                if (t.stock <= 0) {
                    Spacer(Modifier.height(4.dp))
                    Text("فعلاً قابل سفارش نیست", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.error)
                }
            }
        }
    }
}

/** جزئیات سینی — محتویات واقعی + افزودن به سبد */
@Composable
fun MazehDetailScreen(slug: String, onBack: () -> Unit) {
    val context = LocalContext.current
    val repo = remember { CatalogRepository(context) }
    val cart = CartHolder.get(context)
    var tray by remember { mutableStateOf<TrayDto?>(null) }
    var loading by remember { mutableStateOf(true) }
    var qty by remember { androidx.compose.runtime.mutableIntStateOf(1) }

    LaunchedEffect(slug) {
        tray = repo.getTrays().firstOrNull { it.slug == slug }
        loading = false
    }

    Column(Modifier.fillMaxSize()) {
        when {
            loading -> LoadingState(Modifier.weight(1f))
            tray == null -> ErrorState("این سینی پیدا نشد.", onBack, Modifier.weight(1f))
            else -> {
                val t = tray!!
                Column(
                    Modifier
                        .weight(1f)
                        .padding(16.dp)
                        .verticalScroll(rememberScrollState())
                ) {
                    AsyncImage(
                        model = ir.helsairanian.app.core.net.ImageUrls.resolve(t.image),
                        contentDescription = t.imageAlt.ifEmpty { t.name },
                        contentScale = ContentScale.Crop,
                        modifier = Modifier.fillMaxWidth().aspectRatio(4f / 3f).clip(RoundedCornerShape(18.dp)),
                    )
                    Spacer(Modifier.height(12.dp))
                    Text(t.name, style = MaterialTheme.typography.headlineSmall)
                    Text(
                        "برای ${faDigits(t.servesMin)} تا ${faDigits(t.servesMax)} نفر" + if (t.size.isNotBlank()) " · ${t.size}" else "",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    Spacer(Modifier.height(10.dp))
                    PriceText(price = t.basePrice, oldPrice = t.oldPrice, large = true)

                    if (t.description.isNotBlank()) {
                        Spacer(Modifier.height(12.dp))
                        Text(t.description, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }

                    // ── محتویات سینی از سرور ──
                    if (t.contents.isNotEmpty()) {
                        Spacer(Modifier.height(16.dp))
                        Text("محتویات سینی", style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.primary)
                        Spacer(Modifier.height(8.dp))
                        t.contents.forEach { c ->
                            Row(
                                Modifier.fillMaxWidth().padding(vertical = 6.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Text("• ${c.title}", style = MaterialTheme.typography.bodyMedium)
                                Text(faDigits(c.qty), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                            HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.4f))
                        }
                    }

                    Spacer(Modifier.height(18.dp))
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        Surface(shape = RoundedCornerShape(12.dp), border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outline)) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                IconButton(onClick = { if (qty > 1) qty-- }, enabled = qty > 1) {
                                    Icon(Icons.Filled.Remove, "کاهش")
                                }
                                Text(faDigits(qty), style = MaterialTheme.typography.titleMedium)
                                IconButton(onClick = { if (qty < 10) qty++ }, enabled = qty < 10) {
                                    Icon(Icons.Filled.Add, "افزایش")
                                }
                            }
                        }
                        Button(
                            onClick = {
                                cart.add(
                                    CartItem(
                                        key = "tray:${t.id}",
                                        kind = "tray",
                                        refId = t.id,
                                        name = t.name,
                                        image = ir.helsairanian.app.core.net.ImageUrls.resolve(t.image),
                                        unitPrice = t.basePrice,
                                        qty = qty,
                                        maxQty = 10,
                                    )
                                )
                            },
                            enabled = t.stock > 0,
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier.weight(1f).height(48.dp),
                        ) { Text(if (t.stock > 0) "افزودن به سبد" else "فعلاً ناموجود") }
                    }
                    Spacer(Modifier.height(24.dp))
                }
            }
        }
    }
}
