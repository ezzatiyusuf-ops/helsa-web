package ir.helsairanian.app.feature.checkout

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.Checkbox
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.RadioButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.ui.unit.dp
import ir.helsairanian.app.core.data.CartHolder
import ir.helsairanian.app.core.net.CreateOrderRequest
import ir.helsairanian.app.core.net.NetworkModule
import ir.helsairanian.app.core.net.OrderAddress
import ir.helsairanian.app.core.net.OrderCustomer
import ir.helsairanian.app.core.net.OrderItem
import ir.helsairanian.app.core.session.SessionHolder
import ir.helsairanian.app.core.util.faPrice
import ir.helsairanian.app.core.util.friendlyError
import kotlinx.coroutines.launch
import java.util.UUID

/**
 * §20/§24/§25 ثبت سفارش — سرور منبع حقیقت:
 *  • جمع‌ها در دستگاه فقط «نمایشی» است؛ سرور همهٔ مبالغ را بازمحاسبه می‌کند
 *  • idempotencyKey (UUID) → بستنِ امنِ سفارش تکراری در سناریوی «بستن اپ وسط checkout»
 *  • پرداخت آنلاین: بازکردن درگاه در مرورگر خارجی (Custom Tabs/Browser) — تأیید نهایی
 *    فقط از verify سرور-به-سرور می‌آید؛ اپ هرگز خودش سفارش را «پرداخت‌شده» اعلام نمی‌کند
 */
@Composable
fun CheckoutScreen(onDone: () -> Unit) {
    val context = LocalContext.current
    val api = remember { NetworkModule.api(context) }
    val cart = CartHolder.get(context)
    val session = SessionHolder.get(context)
    val scope = rememberCoroutineScope()
    val state by cart.state.collectAsState()

    var firstName by remember { mutableStateOf("") }
    var lastName by remember { mutableStateOf("") }
    var mobile by remember { mutableStateOf("") }
    var province by remember { mutableStateOf("تهران") }
    var city by remember { mutableStateOf("تهران") }
    var full by remember { mutableStateOf("") }
    var postal by remember { mutableStateOf("") }
    var recipient by remember { mutableStateOf("") }
    var note by remember { mutableStateOf("") }
    var isGift by remember { mutableStateOf(false) }
    var giftRecipient by remember { mutableStateOf("") }
    var giftMessage by remember { mutableStateOf("") }
    var shippingCode by remember { mutableStateOf<String?>(null) }
    var paymentId by remember { mutableStateOf("online") }
    var methods by remember { mutableStateOf<List<ir.helsairanian.app.core.net.PaymentMethodDto>>(emptyList()) }
    var shippingMethods by remember { mutableStateOf<List<ir.helsairanian.app.core.net.ShippingMethodDto>>(emptyList()) }
    var sandbox by remember { mutableStateOf(false) }
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var successCode by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(Unit) {
        session.refresh()
        session.user.value?.let { u ->
            if (firstName.isBlank()) firstName = (u.name ?: "").substringBefore(" ").ifBlank { "" }
            if (lastName.isBlank()) lastName = (u.name ?: "").substringAfter(" ", "").ifBlank { "" }
            if (mobile.isBlank()) mobile = u.phone ?: ""
        }
        runCatching { api.shippingMethods() }.onSuccess { shippingMethods = it.methods; shippingCode = it.methods.firstOrNull()?.code }
        runCatching { api.paymentMethods(total = state.displaySubtotal) }.onSuccess { methods = it.methods; sandbox = it.sandbox }
    }

    val formOk = firstName.length >= 2 && lastName.length >= 2 && Regex("^09\\d{9}$").matches(mobile) &&
        full.length >= 5 && Regex("^\\d{10}$").matches(postal) && recipient.length >= 2 &&
        shippingCode != null && state.items.isNotEmpty()

    Column(Modifier.fillMaxSize().padding(16.dp).verticalScroll(rememberScrollState())) {
        Text("ثبت سفارش", style = MaterialTheme.typography.headlineSmall)
        Spacer(Modifier.height(14.dp))

        SectionTitle("اطلاعات خریدار")
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            OutlinedTextField(firstName, { firstName = it }, label = { Text("نام") }, modifier = Modifier.weight(1f), singleLine = true)
            OutlinedTextField(lastName, { lastName = it }, label = { Text("نام خانوادگی") }, modifier = Modifier.weight(1f), singleLine = true)
        }
        Spacer(Modifier.height(10.dp))
        OutlinedTextField(mobile, { mobile = it.filter { c -> c.isDigit() }.take(11) }, label = { Text("موبایل") }, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone), modifier = Modifier.fillMaxWidth(), singleLine = true)

        Spacer(Modifier.height(18.dp))
        SectionTitle("آدرس تحویل")
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            OutlinedTextField(province, { province = it }, label = { Text("استان") }, modifier = Modifier.weight(1f), singleLine = true)
            OutlinedTextField(city, { city = it }, label = { Text("شهر") }, modifier = Modifier.weight(1f), singleLine = true)
        }
        Spacer(Modifier.height(10.dp))
        OutlinedTextField(full, { full = it }, label = { Text("نشانی کامل") }, modifier = Modifier.fillMaxWidth(), minLines = 2)
        Spacer(Modifier.height(10.dp))
        OutlinedTextField(postal, { postal = it.filter { c -> c.isDigit() }.take(10) }, label = { Text("کد پستی (۱۰ رقم)") }, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number), modifier = Modifier.fillMaxWidth(), singleLine = true)
        Spacer(Modifier.height(10.dp))
        OutlinedTextField(recipient, { recipient = it }, label = { Text("نام گیرنده") }, modifier = Modifier.fillMaxWidth(), singleLine = true)

        Spacer(Modifier.height(18.dp))
        SectionTitle("روش ارسال")
        shippingMethods.forEach { m ->
            Row(Modifier.fillMaxWidth().padding(vertical = 4.dp), verticalAlignment = Alignment.CenterVertically) {
                RadioButton(selected = shippingCode == m.code, onClick = { shippingCode = m.code })
                Column {
                    Text(m.label, style = MaterialTheme.typography.bodyMedium)
                    Text(
                        "${faPrice(m.price)} تومان" + if (m.estimatedTime.isNotBlank()) " · ${m.estimatedTime}" else "",
                        style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
        }

        Spacer(Modifier.height(18.dp))
        SectionTitle("روش پرداخت")
        if (sandbox) {
            Surface(color = MaterialTheme.colorScheme.tertiaryContainer, shape = RoundedCornerShape(10.dp)) {
                Text(
                    "حالت آزمایشی: درگاه پرداخت واقعی روی سرور پیکربندی نشده است؛ سفارش ثبت می‌شود ولی پرداخت واقعی انجام نمی‌شود.",
                    style = MaterialTheme.typography.labelSmall, modifier = Modifier.padding(8.dp),
                )
            }
            Spacer(Modifier.height(8.dp))
        }
        methods.filter { it.enabled }.forEach { m ->
            Row(Modifier.fillMaxWidth().padding(vertical = 4.dp), verticalAlignment = Alignment.CenterVertically) {
                RadioButton(selected = paymentId == m.id, onClick = { paymentId = m.id })
                Column {
                    Text(m.label, style = MaterialTheme.typography.bodyMedium)
                    if (m.note.isNotBlank()) Text(m.note, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
        }

        Spacer(Modifier.height(18.dp))
        SectionTitle("گزینه‌های سفارش")
        Row(verticalAlignment = Alignment.CenterVertically) {
            Checkbox(checked = isGift, onCheckedChange = { isGift = it })
            Text("ارسال به‌عنوان هدیه (بسته‌بندی هدیه)", style = MaterialTheme.typography.bodyMedium)
        }
        if (isGift) {
            OutlinedTextField(giftRecipient, { giftRecipient = it }, label = { Text("نام گیرندهٔ هدیه") }, modifier = Modifier.fillMaxWidth(), singleLine = true)
            Spacer(Modifier.height(8.dp))
            OutlinedTextField(giftMessage, { giftMessage = it }, label = { Text("پیام روی کارت هدیه") }, modifier = Modifier.fillMaxWidth())
        }
        Spacer(Modifier.height(10.dp))
        OutlinedTextField(note, { note = it }, label = { Text("یادداشت سفارش (اختیاری)") }, modifier = Modifier.fillMaxWidth())

        Spacer(Modifier.height(18.dp))
        Surface(color = MaterialTheme.colorScheme.surfaceVariant, shape = RoundedCornerShape(14.dp)) {
            Column(Modifier.padding(14.dp).fillMaxWidth()) {
                Text("جمع سبد: ${faPrice(state.displaySubtotal)} تومان", style = MaterialTheme.typography.bodyMedium)
                Text("هزینهٔ ارسال و جمع نهایی توسط سرور محاسبه می‌شود.", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }

        Spacer(Modifier.height(14.dp))
        Button(
            onClick = {
                busy = true; error = null
                scope.launch {
                    val key = UUID.randomUUID().toString()
                    runCatching {
                        api.createOrder(
                            CreateOrderRequest(
                                customer = OrderCustomer(firstName, lastName, mobile),
                                address = OrderAddress(province, city, full, postal, recipient = recipient, phone = mobile),
                                items = state.items.map { OrderItem(key = it.key, qty = it.qty, name = it.name, price = it.unitPrice, image = it.image, weight = it.weight) },
                                shippingMethod = shippingCode ?: "",
                                paymentMethod = paymentId,
                                idempotencyKey = key,
                                subtotal = state.displaySubtotal,
                                note = note.ifBlank { null },
                                isGift = isGift,
                                giftRecipient = giftRecipient.ifBlank { null },
                                giftMessage = giftMessage.ifBlank { null },
                            )
                        )
                    }.onSuccess { res ->
                        busy = false
                        if (res.ok) {
                            cart.clear()
                            successCode = res.code
                            // پرداخت آنلاین: درگاه در مرورگر/تب خارجی — تأیید فقط سمت سرور (§25)
                            res.paymentUrl?.let { url ->
                                runCatching { context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url))) }
                            }
                            onDone()
                        } else error = res.message ?: "ثبت سفارش ناموفق بود."
                    }.onFailure { busy = false; error = friendlyError(it) }
                }
            },
            enabled = formOk && !busy,
            shape = RoundedCornerShape(14.dp),
            modifier = Modifier.fillMaxWidth().height(52.dp),
        ) { Text(if (busy) "در حال ثبت…" else "ثبت نهایی سفارش") }

        error?.let {
            Spacer(Modifier.height(8.dp))
            Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodyMedium)
        }
        Spacer(Modifier.height(24.dp))
    }
}

@Composable
private fun SectionTitle(t: String) {
    Text(t, style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.primary)
    Spacer(Modifier.height(8.dp))
}
