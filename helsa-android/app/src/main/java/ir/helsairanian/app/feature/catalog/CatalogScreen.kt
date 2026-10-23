package ir.helsairanian.app.feature.catalog

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowDropDown
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
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
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import ir.helsairanian.app.core.data.CartHolder
import ir.helsairanian.app.core.data.CatalogRepository
import ir.helsairanian.app.core.net.ProductDto
import ir.helsairanian.app.core.util.UiState
import ir.helsairanian.app.core.util.faDigits
import ir.helsairanian.app.core.util.friendlyError
import ir.helsairanian.app.designsystem.CardVariant
import ir.helsairanian.app.designsystem.EmptyState
import ir.helsairanian.app.designsystem.ErrorState
import ir.helsairanian.app.designsystem.HelsaProductCard
import ir.helsairanian.app.designsystem.LoadingState
import ir.helsairanian.app.feature.home.toCard
import ir.helsairanian.app.feature.home.toCartItem

/** §10/§11/§15: کاتالوگ از API واقعی (۱۸۴)، فیلتر دسته + ۵ مرتب‌سازی؛ صفحه‌بندی محلی (هر بار ۲۴ کارت) */
@Composable
fun CatalogScreen(showCategoriesFirst: Boolean = false, onOpenProduct: (String) -> Unit) {
    val context = LocalContext.current
    val repo = remember { CatalogRepository(context) }
    val cart = CartHolder.get(context)

    var state by remember { mutableStateOf<UiState<List<ProductDto>>>(UiState.Loading) }
    var selectedCat by remember { mutableStateOf<String?>(null) }
    var sort by remember { mutableStateOf(0) }
    var visibleCount by remember { mutableIntStateOf(24) }
    var reloadKey by remember { mutableIntStateOf(0) }

    LaunchedEffect(reloadKey) {
        state = UiState.Loading
        try {
            val list = repo.getProducts()
            state = if (list.isEmpty()) UiState.Empty else UiState.Ready(list)
        } catch (t: Throwable) { state = UiState.Error(friendlyError(t)) }
    }

    val sorts = listOf("محبوب‌ترین", "جدیدترین", "ارزان‌ترین", "گران‌ترین", "بیشترین تخفیف")
    var sortMenu by remember { mutableStateOf(false) }

    Column(Modifier.fillMaxSize().padding(horizontal = 14.dp)) {
        Spacer(Modifier.height(10.dp))

        when (val s = state) {
            is UiState.Loading -> LoadingState(Modifier.weight(1f))
            is UiState.Error -> ErrorState(s.message, { reloadKey++ }, Modifier.weight(1f))
            UiState.Empty -> EmptyState(title = "محصولی یافت نشد", modifier = Modifier.weight(1f))
            is UiState.Ready -> {
                val products = s.data
                val cats = repo.categories.orEmpty()

                // ── چیپ‌های دسته (از API واقعی — تعریف موازی در اپ وجود ندارد §11) ──
                LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    item {
                        FilterChip(selected = selectedCat == null, onClick = { selectedCat = null; visibleCount = 24 }, label = { Text("همه") })
                    }
                    items(cats) { c ->
                        FilterChip(
                            selected = selectedCat == c.slug,
                            onClick = { selectedCat = if (selectedCat == c.slug) null else c.slug; visibleCount = 24 },
                            label = { Text(c.name) },
                        )
                    }
                }

                Row(Modifier.fillMaxWidth().padding(vertical = 8.dp), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = androidx.compose.ui.Alignment.CenterVertically) {
                    Text(
                        "${faDigits(if (selectedCat != null) products.count { it.category == selectedCat } else products.size)} محصول",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    OutlinedButton(onClick = { sortMenu = true }) {
                        Text(sorts[sort])
                        Icon(Icons.Filled.ArrowDropDown, null)
                    }
                    DropdownMenu(expanded = sortMenu, onDismissRequest = { sortMenu = false }) {
                        sorts.forEachIndexed { i, label ->
                            DropdownMenuItem(text = { Text(label) }, onClick = { sort = i; sortMenu = false; visibleCount = 24 })
                        }
                    }
                }

                val filtered = remember(selectedCat, sort, products) {
                    val f = if (selectedCat != null) products.filter { it.category == selectedCat } else products
                    when (sort) {
                        0 -> f.sortedByDescending { it.reviews }
                        1 -> f.sortedByDescending { it.id }
                        2 -> f.sortedBy { it.price }
                        3 -> f.sortedByDescending { it.price }
                        4 -> f.sortedByDescending { it.discount }
                        else -> f
                    }
                }

                if (filtered.isEmpty()) {
                    EmptyState(title = "در این دسته محصولی نیست", modifier = Modifier.weight(1f))
                } else {
                    LazyVerticalGrid(
                        columns = GridCells.Fixed(2),
                        horizontalArrangement = Arrangement.spacedBy(10.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp),
                        contentPadding = PaddingValues(bottom = 16.dp),
                        modifier = Modifier.weight(1f),
                    ) {
                        items(filtered.take(visibleCount)) { p ->
                            HelsaProductCard(
                                product = p.toCard(),
                                variant = CardVariant.Standard,
                                onOpen = { onOpenProduct(p.slug) },
                                onAddToCart = { cart.add(p.toCartItem()) },
                            )
                        }
                        if (visibleCount < filtered.size) {
                            item(span = { androidx.compose.foundation.lazy.grid.GridItemSpan(2) }) {
                                Surface(
                                    onClick = { visibleCount += 24 },
                                    shape = MaterialTheme.shapes.medium,
                                    color = MaterialTheme.colorScheme.surfaceVariant,
                                    modifier = Modifier.fillMaxWidth().padding(top = 4.dp),
                                ) {
                                    Text(
                                        "نمایش بیشتر (${faDigits(filtered.size - visibleCount)} محصول باقی‌مانده)",
                                        style = MaterialTheme.typography.labelLarge,
                                        color = MaterialTheme.colorScheme.primary,
                                        modifier = Modifier.padding(vertical = 12.dp),
                                        textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
