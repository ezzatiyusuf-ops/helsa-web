package ir.helsairanian.app.feature.search

import android.content.Context
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.History
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringSetPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import coil.compose.AsyncImage
import ir.helsairanian.app.core.net.NetworkModule
import ir.helsairanian.app.core.net.SearchResponse
import ir.helsairanian.app.core.util.faDigits
import ir.helsairanian.app.core.util.faPrice
import ir.helsairanian.app.designsystem.EmptyState
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

private val Context.searchStore by preferencesDataStore("helsa_search")
private val KEY_RECENT = stringSetPreferencesKey("recent")

/** §14 جستجوی سریع — سرور-ساید (همان موتور جستجوی فارسی سایت) + تاریخچهٔ محلی */
@Composable
fun SearchScreen(onOpenProduct: (String) -> Unit, onOpenCategory: (String) -> Unit) {
    val context = LocalContext.current
    val api = remember { NetworkModule.api(context) }
    val scope = androidx.compose.runtime.rememberCoroutineScope()

    var query by remember { mutableStateOf("") }
    var result by remember { mutableStateOf<SearchResponse?>(null) }
    var loading by remember { mutableStateOf(false) }
    var recent by remember { mutableStateOf<List<String>>(emptyList()) }

    LaunchedEffect(Unit) {
        context.searchStore.data.collect { prefs -> recent = (prefs[KEY_RECENT] ?: emptySet()).toList().take(6) }
    }

    // debounce 350ms — روی سرور جستجو می‌شود؛ کاتالوگ در حافظه دانلود نمی‌شود
    LaunchedEffect(query) {
        if (query.isBlank()) { result = null; return@LaunchedEffect }
        delay(350)
        loading = true
        runCatching { api.search(query) }
            .onSuccess {
                result = it
                loading = false
                if (it.results.isNotEmpty()) {
                    scope.launch {
                        context.searchStore.edit { prefs ->
                            prefs[KEY_RECENT] = ((prefs[KEY_RECENT] ?: emptySet()) + query).toList().takeLast(8).toSet()
                        }
                    }
                }
            }
            .onFailure { loading = false; result = SearchResponse() }
    }

    Column(Modifier.fillMaxSize().padding(16.dp)) {
        OutlinedTextField(
            value = query,
            onValueChange = { query = it },
            placeholder = { Text("جستجو در هلسا… (خرما، آجیل، mazafati)") },
            leadingIcon = { Icon(Icons.Filled.Search, null) },
            trailingIcon = {
                if (query.isNotEmpty()) IconButton(onClick = { query = "" }) { Icon(Icons.Filled.Close, "پاک‌کردن جستجو") }
            },
            singleLine = true,
            shape = RoundedCornerShape(14.dp),
            modifier = Modifier.fillMaxWidth(),
        )

        if (query.isBlank()) {
            if (recent.isNotEmpty()) {
                Spacer(Modifier.height(14.dp))
                Text("جستجوهای اخیر", style = MaterialTheme.typography.titleSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Spacer(Modifier.height(8.dp))
                recent.forEach { r ->
                    Surface(onClick = { query = r }, color = MaterialTheme.colorScheme.surfaceVariant, shape = RoundedCornerShape(10.dp), modifier = Modifier.padding(vertical = 3.dp)) {
                        Row(Modifier.padding(horizontal = 12.dp, vertical = 9.dp), verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Filled.History, null, modifier = Modifier.size(15.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
                            Spacer(Modifier.width(8.dp))
                            Text(r, style = MaterialTheme.typography.bodyMedium)
                        }
                    }
                }
            } else {
                EmptyState("برای شروع، نام محصول را جستجو کنید")
            }
        } else {
            val r = result
            when {
                loading -> Text("در حال جستجو…", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(vertical = 14.dp))
                r == null -> {}
                r.results.isEmpty() && r.categories.isEmpty() && r.trays.isEmpty() -> EmptyState("نتیجه‌ای برای «$query» پیدا نشد", "املای عبارت را بررسی کنید یا دسته‌ها را ببینید")
                else -> LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(vertical = 12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    if (r.categories.isNotEmpty()) {
                        item { Text("دسته‌ها", style = MaterialTheme.typography.titleSmall, color = MaterialTheme.colorScheme.tertiary) }
                        items(r.categories) { c ->
                            Surface(onClick = { onOpenCategory(c.slug) }, shape = RoundedCornerShape(12.dp), color = MaterialTheme.colorScheme.primaryContainer) {
                                Row(Modifier.padding(10.dp), verticalAlignment = Alignment.CenterVertically) {
                                    Text("📁 ${c.name}", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onPrimaryContainer)
                                }
                            }
                        }
                    }
                    if (r.results.isNotEmpty()) {
                        item { Text("محصولات", style = MaterialTheme.typography.titleSmall, color = MaterialTheme.colorScheme.tertiary) }
                        items(r.results) { p ->
                            Surface(onClick = { onOpenProduct(p.slug) }, shape = RoundedCornerShape(12.dp), border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant)) {
                                Row(Modifier.padding(10.dp), verticalAlignment = Alignment.CenterVertically) {
                                    AsyncImage(model = ir.helsairanian.app.core.net.ImageUrls.resolve(p.image), contentDescription = p.name, modifier = Modifier.size(52.dp).padding(start = 0.dp))
                                    Spacer(Modifier.width(10.dp))
                                    Column(Modifier.weight(1f)) {
                                        Text(p.name, style = MaterialTheme.typography.titleSmall)
                                        p.price?.let {
                                            Text("${faPrice(it)} تومان", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.primary)
                                        }
                                    }
                                }
                            }
                        }
                    }
                    if (r.trays.isNotEmpty()) {
                        item { Text("سینی مزه", style = MaterialTheme.typography.titleSmall, color = MaterialTheme.colorScheme.tertiary) }
                        items(r.trays) { t ->
                            Surface(onClick = { onOpenProduct(t.slug) }, shape = RoundedCornerShape(12.dp), border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant)) {
                                Row(Modifier.padding(10.dp), verticalAlignment = Alignment.CenterVertically) {
                                    AsyncImage(model = ir.helsairanian.app.core.net.ImageUrls.resolve(t.image), contentDescription = t.name, modifier = Modifier.size(52.dp))
                                    Spacer(Modifier.width(10.dp))
                                    Text("🧺 ${t.name}", style = MaterialTheme.typography.titleSmall)
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
