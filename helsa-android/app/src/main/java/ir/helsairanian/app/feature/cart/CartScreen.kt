package ir.helsairanian.app.feature.cart

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
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Remove
import androidx.compose.material.icons.filled.ShoppingCart
import androidx.compose.material3.Button
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import ir.helsairanian.app.core.data.CartHolder
import ir.helsairanian.app.core.data.CartState
import ir.helsairanian.app.core.util.faDigits
import ir.helsairanian.app.core.util.faPrice
import ir.helsairanian.app.designsystem.EmptyState

/**
 * §20 سبد خرید — همان مدل سایت: سبدِ محلی + اعتبارسنجی قیمت/موجودی از سرور.
 * جمعِ نمایشی از قیمت‌های «سرور» (بعد از check) محاسبه می‌شود؛ قیمت نهایی قطعی
 * فقط در checkout توسط سرور بازمحاسبه می‌شود.
 */
@Composable
fun CartScreen(onCheckout: () -> Unit, onContinueShopping: () -> Unit) {
    val context = LocalContext.current
    val cart = CartHolder.get(context)
    val state by cart.state.collectAsState()

    Column(Modifier.fillMaxSize().padding(16.dp)) {
        Text("سبد خرید", style = MaterialTheme.typography.headlineSmall)
        Spacer(Modifier.height(10.dp))

        if (state.items.isEmpty()) {
            EmptyState("سبد خرید شما خالی است", "از صفحهٔ محصولات انتخاب کنید")
            OutlinedButton(onClick = onContinueShopping, modifier = Modifier.fillMaxWidth()) { Text("ادامهٔ خرید") }
        } else {
            LazyColumn(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                items(state.items, key = { it.key }) { item ->
                    val serverPrice = state.serverPrices[item.key]
                    val issue = state.serverIssues[item.key]
                    Surface(shape = RoundedCornerShape(16.dp), border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant)) {
                        Row(Modifier.padding(10.dp), verticalAlignment = Alignment.CenterVertically) {
                            AsyncImage(
                                model = item.image,
                                contentDescription = item.name,
                                modifier = Modifier.size(72.dp).clip(RoundedCornerShape(12.dp)),
                            )
                            Spacer(Modifier.width(10.dp))
                            Column(Modifier.weight(1f)) {
                                Text(item.name, style = MaterialTheme.typography.titleSmall)
                                if (item.weight.isNotBlank()) Text(item.weight, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(top = 4.dp)) {
                                    Text(
                                        faPrice(serverPrice ?: item.unitPrice) + " تومان",
                                        style = MaterialTheme.typography.titleSmall,
                                        color = if (serverPrice != null && serverPrice != item.unitPrice) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onSurface,
                                    )
                                    if (serverPrice != null && serverPrice != item.unitPrice) {
                                        Spacer(Modifier.width(6.dp))
                                        Text("(قیمت به‌روز شد)", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.error)
                                    }
                                }
                                issue?.let {
                                    Text(it, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.error, modifier = Modifier.padding(top = 2.dp))
                                }
                            }
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Surface(shape = RoundedCornerShape(10.dp), border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outline)) {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        IconButton(onClick = { cart.setQty(item.key, item.qty - 1) }, modifier = Modifier.size(30.dp)) { Icon(Icons.Filled.Remove, "کاهش", modifier = Modifier.size(15.dp)) }
                                        Text(faDigits(item.qty), style = MaterialTheme.typography.titleSmall)
                                        IconButton(onClick = { cart.setQty(item.key, item.qty + 1) }, modifier = Modifier.size(30.dp)) { Icon(Icons.Filled.Add, "افزایش", modifier = Modifier.size(15.dp)) }
                                    }
                                }
                                IconButton(onClick = { cart.remove(item.key) }) { Icon(Icons.Filled.Delete, "حذف", tint = MaterialTheme.colorScheme.error, modifier = Modifier.size(18.dp)) }
                            }
                        }
                    }
                }
            }

            Spacer(Modifier.height(10.dp))
            Surface(shape = RoundedCornerShape(16.dp), color = MaterialTheme.colorScheme.surfaceVariant) {
                Column(Modifier.padding(14.dp).fillMaxWidth()) {
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text("جمع سبد (پیش از ارسال)", style = MaterialTheme.typography.bodyMedium)
                        Text(
                            if (state.checking) "در حال به‌روزرسانی…" else "${faPrice(state.displaySubtotal)} تومان",
                            style = MaterialTheme.typography.titleMedium,
                            color = MaterialTheme.colorScheme.primary,
                        )
                    }
                    Text(
                        "قیمت نهایی توسط سرور در ثبت سفارش بازمحاسبه می‌شود.",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.padding(top = 4.dp),
                    )
                }
            }
            Spacer(Modifier.height(10.dp))
            Button(onClick = onCheckout, shape = RoundedCornerShape(14.dp), modifier = Modifier.fillMaxWidth().height(52.dp)) {
                Icon(Icons.Filled.ShoppingCart, null)
                Spacer(Modifier.width(8.dp))
                Text("ادامهٔ ثبت سفارش")
            }
        }
    }
}
