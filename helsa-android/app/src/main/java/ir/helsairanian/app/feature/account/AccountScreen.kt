package ir.helsairanian.app.feature.account

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
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.Logout
import androidx.compose.material.icons.filled.Receipt
import androidx.compose.material.icons.filled.SupportAgent
import androidx.compose.material3.Button
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import ir.helsairanian.app.core.net.NetworkModule
import ir.helsairanian.app.core.net.OrderSummaryDto
import ir.helsairanian.app.core.session.SessionHolder
import ir.helsairanian.app.core.util.faDigits
import ir.helsairanian.app.core.util.faPrice
import ir.helsairanian.app.core.util.friendlyError
import ir.helsairanian.app.core.util.jalaliDate
import ir.helsairanian.app.designsystem.EmptyState
import ir.helsairanian.app.designsystem.ErrorState
import ir.helsairanian.app.designsystem.LoadingState
import ir.helsairanian.app.core.util.UiState
import kotlinx.coroutines.launch

/** §23 حساب من — وضعیت واقعی نشست سرور؛ منوی حساب؛ خروج */
@Composable
fun AccountScreen(onOpenOrders: () -> Unit, onLogin: () -> Unit) {
    val context = LocalContext.current
    val session = SessionHolder.get(context)
    val user by session.user.collectAsState()
    val scope = rememberCoroutineScope()

    LaunchedEffect(Unit) { session.refresh() }

    Column(Modifier.fillMaxSize().padding(20.dp)) {
        Text("حساب من", style = MaterialTheme.typography.headlineSmall)
        Spacer(Modifier.height(14.dp))

        val u = user
        if (u == null) {
            Surface(shape = RoundedCornerShape(18.dp), color = MaterialTheme.colorScheme.surfaceVariant) {
                Column(Modifier.padding(20.dp).fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("وارد حساب هلسا نشده‌اید", style = MaterialTheme.typography.titleMedium)
                    Text("با همان حساب سایت وارد شوید — سفارش‌هایتان یکجاست", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Spacer(Modifier.height(12.dp))
                    Button(onClick = onLogin, shape = RoundedCornerShape(12.dp)) { Text("ورود / ثبت‌نام") }
                }
            }
        } else {
            Surface(shape = RoundedCornerShape(18.dp), color = MaterialTheme.colorScheme.primaryContainer) {
                Row(Modifier.padding(16.dp).fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                    Column(Modifier.weight(1f)) {
                        Text(u.name ?: "کاربر هلسا", style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onPrimaryContainer)
                        u.phone?.let { Text(faDigits(it), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onPrimaryContainer) }
                    }
                    IconButton(onClick = {
                        scope.launch { session.logout() }
                    }) { Icon(Icons.AutoMirrored.Filled.Logout, "خروج", tint = MaterialTheme.colorScheme.onPrimaryContainer) }
                }
            }
            Spacer(Modifier.height(14.dp))
            MenuItem("سفارش‌های من", Icons.Filled.Receipt, onOpenOrders)
            Spacer(Modifier.height(8.dp))
            MenuItem("پشتیبانی", Icons.Filled.SupportAgent) {
                // صفحهٔ پشتیبانی در فاز بعد؛ فعلاً به پشتیبانی سایت اشاره می‌کند
            }
        }
    }
}

@Composable
private fun MenuItem(title: String, icon: androidx.compose.ui.graphics.vector.ImageVector, onClick: () -> Unit) {
    Surface(onClick = onClick, shape = RoundedCornerShape(14.dp), border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant)) {
        Row(Modifier.padding(14.dp).fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Icon(icon, null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(20.dp))
            Spacer(Modifier.width(10.dp))
            Text(title, style = MaterialTheme.typography.bodyLarge)
        }
    }
}

/** §24 سفارش‌ها — از همان API سایت با همان نشست */
@Composable
fun OrdersScreen(onBack: () -> Unit) {
    val context = LocalContext.current
    val api = remember { NetworkModule.api(context) }
    var state by remember { mutableStateOf<UiState<List<OrderSummaryDto>>>(UiState.Loading) }

    LaunchedEffect(Unit) {
        try {
            val res = api.orders()
            state = if (!res.ok) UiState.Error(res.message ?: "برای مشاهدهٔ سفارش‌ها وارد شوید.")
            else if (res.orders.isEmpty()) UiState.Empty
            else UiState.Ready(res.orders)
        } catch (t: Throwable) { state = UiState.Error(friendlyError(t)) }
    }

    Column(Modifier.fillMaxSize().padding(16.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "بازگشت") }
            Text("سفارش‌های من", style = MaterialTheme.typography.titleLarge)
        }
        Spacer(Modifier.height(10.dp))
        when (val s = state) {
            is UiState.Loading -> LoadingState()
            is UiState.Error -> ErrorState(s.message, onBack)
            UiState.Empty -> EmptyState("هنوز سفارشی ثبت نکرده‌اید", "اولین خرید خود را از محصولات هلسا شروع کنید")
            is UiState.Ready -> LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                items(s.data, key = { it.id }) { o ->
                    OrderRow(o)
                }
            }
        }
    }
}

@Composable
private fun OrderRow(o: OrderSummaryDto) {
    val statusFa = when (o.status) {
        "pending" -> "در انتظار پرداخت"
        "processing" -> "در حال آماده‌سازی"
        "shipped" -> "ارسال شده"
        "delivered" -> "تحویل شده"
        "cancelled" -> "لغو شده"
        else -> o.status
    }
    val payFa = when (o.paymentStatus) {
        "paid" -> "پرداخت شده"
        "pending" -> "در انتظار پرداخت"
        "failed" -> "ناموفق"
        else -> o.paymentStatus
    }
    Surface(shape = RoundedCornerShape(16.dp), border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant)) {
        Column(Modifier.padding(14.dp)) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text("سفارش ${o.code}", style = MaterialTheme.typography.titleSmall)
                Text(jalaliDate(o.createdAt), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            Spacer(Modifier.height(6.dp))
            Text("${o.items.sumOf { it.qty }} قلم — ${faPrice(o.total)} تومان", style = MaterialTheme.typography.bodyMedium)
            Spacer(Modifier.height(6.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Surface(color = if (o.paymentStatus == "paid") MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.tertiaryContainer, shape = RoundedCornerShape(8.dp)) {
                    Text(payFa, style = MaterialTheme.typography.labelSmall, modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp))
                }
                Surface(color = MaterialTheme.colorScheme.surfaceVariant, shape = RoundedCornerShape(8.dp)) {
                    Text(statusFa, style = MaterialTheme.typography.labelSmall, modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp))
                }
            }
            HorizontalDivider(Modifier.padding(vertical = 8.dp), color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.4f))
            o.items.take(3).forEach { item ->
                Text("• ${item.name} ×${faDigits(item.qty)}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            if (o.items.size > 3) Text("و ${faDigits(o.items.size - 3)} قلم دیگر…", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}
