package ir.helsairanian.app.core.data

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.intPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import ir.helsairanian.app.core.net.CartCheckItem
import ir.helsairanian.app.core.net.NetworkModule
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.serialization.Serializable
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

private val Context.cartStore by preferencesDataStore("helsa_cart")

/**
 * سبد خرید — همان مدل سایت: سبدِ کلاینت + اعتبارسنجی سرور.
 * قیمت/موجودی نهایی همیشه از سرور (api/cart/check) می‌آید؛
 * هیچ قیمت قطعیِ	device-side‌ای محاسبه نمی‌شود (§20).
 */
@Serializable
data class CartItem(
    val key: String,          // product:{id} یا tray:{id} یا gift:{id}
    val kind: String,         // product | tray | gift
    val refId: Int,
    val name: String,
    val image: String,
    val unitPrice: Int,       // صرفاً نمایش؛ سرور مرجع است
    val weight: String = "",
    val qty: Int = 1,
    val maxQty: Int = 99,
)

data class CartState(
    val items: List<CartItem> = emptyList(),
    /** نتیجهٔ آخرین اعتبارسنجی سرور: قیمت واقعی هر قلم (به کلید آیتم) */
    val serverPrices: Map<String, Int> = emptyMap(),
    val serverIssues: Map<String, String> = emptyMap(), // key → پیام (ناموجود/موجودی کم)
    val checking: Boolean = false,
) {
    val count: Int get() = items.sumOf { it.qty }
    val displaySubtotal: Int get() = items.sumOf { (serverPrices[it.key] ?: it.unitPrice) * it.qty }
}

class CartRepository(private val context: Context) {
    private val api get() = NetworkModule.api(context)
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val json = Json { ignoreUnknownKeys = true }

    private val _state = MutableStateFlow(CartState())
    val state: StateFlow<CartState> = _state

    init {
        // بازیابی سبد از دیسک (فقط اقلام غیرحساس — بدون دادهٔ پرداخت/مشتری §28)
        scope.launch {
            val raw = context.cartStore.data.map { it[KEY_ITEMS] }.collect { stored ->
                if (stored != null && _state.value.items.isEmpty()) {
                    runCatching { json.decodeFromString<List<CartItem>>(stored) }
                        .onSuccess { list -> _state.update { it.copy(items = list) } }
                }
            }
        }
    }

    fun add(item: CartItem) {
        _state.update { s ->
            val idx = s.items.indexOfFirst { it.key == item.key }
            val items = if (idx >= 0) s.items.mapIndexed { i, x ->
                if (i == idx) x.copy(qty = minOf(x.qty + item.qty, item.maxQty)) else x
            } else s.items + item
            s.copy(items = items)
        }
        persist()
        refreshServerPrices()
    }

    fun setQty(key: String, qty: Int) {
        _state.update { s ->
            s.items.mapNotNull { x ->
                if (x.key != key) x
                else when {
                    qty <= 0 -> null
                    else -> x.copy(qty = minOf(qty, x.maxQty))
                }
            }.let { s.copy(items = it) }
        }
        persist()
        refreshServerPrices()
    }

    fun remove(key: String) {
        _state.update { it.copy(items = it.items.filterNot { x -> x.key == key }) }
        persist()
        refreshServerPrices()
    }

    fun clear() {
        _state.update { CartState() }
        scope.launch { context.cartStore.edit { it.clear() } }
    }

    /** اعتبارسنجی سبد روی سرور — قیمت/موجودی واقعی (قبل از نمایش جمع و checkout) */
    fun refreshServerPrices() {
        val items = _state.value.items
        if (items.isEmpty()) { _state.update { it.copy(serverPrices = emptyMap(), serverIssues = emptyMap()) }; return }
        _state.update { it.copy(checking = true) }
        scope.launch {
            runCatching {
                api.cartCheck(items.map {
                    CartCheckItem(key = it.key, kind = it.kind, id = it.refId, qty = it.qty, price = it.unitPrice)
                })
            }.onSuccess { res ->
                _state.update { s ->
                    s.copy(
                        checking = false,
                        serverPrices = res.items.associate { it.key to it.price },
                        serverIssues = res.items.filter { it.status != "ok" }.associate {
                            it.key to when (it.status) {
                                "out_of_stock" -> "ناموجود شد"
                                "price_changed" -> "قیمت به‌روز شد"
                                "low_stock" -> "موجودی کم است"
                                else -> it.status
                            }
                        },
                    )
                }
            }.onFailure { _state.update { it.copy(checking = false) } }
        }
    }

    private fun persist() {
        val snapshot = _state.value.items
        scope.launch {
            context.cartStore.edit { prefs ->
                prefs[KEY_ITEMS] = json.encodeToString(snapshot)
            }
        }
    }

    companion object {
        private val KEY_ITEMS = stringPreferencesKey("items")
    }
}

/** تک‌نمونهٔ سراسری سبد (دسترسی از هر ViewModel بدون ساخت مجدد) */
object CartHolder {
    @Volatile private var repo: CartRepository? = null
    fun get(context: Context): CartRepository = repo ?: synchronized(this) {
        repo ?: CartRepository(context.applicationContext).also { repo = it }
    }
}
