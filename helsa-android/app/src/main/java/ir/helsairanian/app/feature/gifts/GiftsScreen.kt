package ir.helsairanian.app.feature.gifts

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
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import ir.helsairanian.app.core.analytics.Analytics
import ir.helsairanian.app.core.analytics.HelsaAnalytics
import ir.helsairanian.app.core.data.CartHolder
import ir.helsairanian.app.core.data.CatalogRepository
import ir.helsairanian.app.core.data.CartItem
import ir.helsairanian.app.core.net.GiftPackageDto
import ir.helsairanian.app.core.util.UiState
import ir.helsairanian.app.core.util.faPrice
import ir.helsairanian.app.core.util.friendlyError
import ir.helsairanian.app.designsystem.EmptyState
import ir.helsairanian.app.designsystem.ErrorState
import ir.helsairanian.app.designsystem.LoadingState
import ir.helsairanian.app.designsystem.PriceText

/** §19 هدایا — بسته‌های واقعی هدیه از API سایت؛ فیلتر مناسبت از همان داده */
@Composable
fun GiftsScreen(onAddToCartDone: () -> Unit) {
    val context = LocalContext.current
    val repo = remember { CatalogRepository(context) }
    val cart = CartHolder.get(context)
    val analytics = remember { HelsaAnalytics() }

    var state by remember { mutableStateOf<UiState<List<GiftPackageDto>>>(UiState.Loading) }
    var occasion by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(Unit) {
        analytics.track(Analytics.VIEW_GIFT)
        try {
            val list = repo.getGifts()
            state = if (list.isEmpty()) UiState.Empty else UiState.Ready(list)
        } catch (t: Throwable) { state = UiState.Error(friendlyError(t)) }
    }

    Column(Modifier.fillMaxSize().padding(16.dp)) {
        Text("هدایای هلسا", style = MaterialTheme.typography.headlineSmall)
        Text("بسته‌بندی پرمیوم — آمادهٔ هدیه", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Spacer(Modifier.height(12.dp))

        when (val s = state) {
            is UiState.Loading -> LoadingState(Modifier.weight(1f))
            is UiState.Error -> ErrorState(message = s.message, modifier = Modifier.weight(1f))
            UiState.Empty -> EmptyState(title = "فعلاً بستهٔ هدیه‌ای فعال نیست", modifier = Modifier.weight(1f))
            is UiState.Ready -> {
                val occasions = s.data.flatMap { it.occasions }.distinct()
                if (occasions.isNotEmpty()) {
                    LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        item { FilterChip(selected = occasion == null, onClick = { occasion = null }, label = { Text("همه") }) }
                        items(occasions) { o ->
                            FilterChip(selected = occasion == o, onClick = { occasion = if (occasion == o) null else o }, label = { Text(o) })
                        }
                    }
                    Spacer(Modifier.height(12.dp))
                }
                val filtered = if (occasion != null) s.data.filter { it.occasions.contains(occasion) } else s.data
                LazyVerticalGrid(
                    columns = GridCells.Fixed(2),
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                    contentPadding = PaddingValues(bottom = 16.dp),
                    modifier = Modifier.weight(1f),
                ) {
                    items(filtered, key = { it.id }) { g ->
                        GiftCard(g, onAdd = {
                            analytics.track(Analytics.ADD_TO_CART, mapOf("gift" to g.slug))
                            cart.add(
                                CartItem(
                                    key = "gift:${g.id}",
                                    kind = "gift",
                                    refId = g.id,
                                    name = g.name,
                                    image = ir.helsairanian.app.core.net.ImageUrls.resolve(g.image),
                                    unitPrice = g.basePrice,
                                    qty = 1,
                                    maxQty = g.maxQty,
                                )
                            )
                            onAddToCartDone()
                        })
                    }
                }
            }
        }
    }
}

@Composable
private fun GiftCard(g: GiftPackageDto, onAdd: () -> Unit) {
    Surface(shape = RoundedCornerShape(20.dp), border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant)) {
        Column(Modifier.padding(10.dp)) {
            AsyncImage(
                model = ir.helsairanian.app.core.net.ImageUrls.resolve(g.image),
                contentDescription = g.imageAlt.ifEmpty { g.name },
                contentScale = ContentScale.Crop,
                modifier = Modifier.fillMaxWidth().aspectRatio(1f).clip(RoundedCornerShape(14.dp)),
            )
            Spacer(Modifier.height(8.dp))
            Text(g.name, style = MaterialTheme.typography.titleSmall, maxLines = 1)
            if (g.contents.isNotEmpty()) {
                Text(g.contents.take(3).joinToString("، "), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1)
            }
            Spacer(Modifier.height(6.dp))
            PriceText(price = g.basePrice, oldPrice = g.oldPrice)
            Spacer(Modifier.height(8.dp))
            Button(onClick = onAdd, enabled = g.isActive, shape = RoundedCornerShape(12.dp), modifier = Modifier.fillMaxWidth().height(40.dp)) {
                Text("افزودن به سبد", style = MaterialTheme.typography.labelLarge)
            }
        }
    }
}
