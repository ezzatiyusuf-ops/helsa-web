package ir.helsairanian.app.feature.auth

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import ir.helsairanian.app.core.net.NetworkModule
import ir.helsairanian.app.core.net.OtpRequest
import ir.helsairanian.app.core.net.OtpVerify
import ir.helsairanian.app.core.session.SessionHolder
import ir.helsairanian.app.core.util.faDigits
import ir.helsairanian.app.core.util.friendlyError
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

/**
 * §22 OTP — کاملاً واقعی روی همان بک‌اند سایت.
 * اگر SMS ارائه‌دهنده پیکربندی نباشد، بک‌اند صادقانه اعلام می‌کند (demo)
 * و ما نیز حالت توسعه را شفاف نشان می‌دهیم — هرگز «ارسال شد» جعلی نمی‌گوییم.
 */
@Composable
fun OtpScreen(phone: String, onVerified: () -> Unit) {
    val context = LocalContext.current
    val api = remember { NetworkModule.api(context) }
    val session = SessionHolder.get(context)
    val scope = rememberCoroutineScope()

    var code by remember { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var devCode by remember { mutableStateOf<String?>(null) }
    var devMode by remember { mutableStateOf(false) }
    var resendIn by remember { mutableIntStateOf(0) }

    LaunchedEffect(Unit) {
        // درخواست کد هنگام ورود به صفحه
        busy = true
        runCatching { api.otpRequest(OtpRequest(phone)) }
            .onSuccess {
                busy = false
                devMode = it.demo == true
                devCode = it.devCode
                resendIn = 120
            }
            .onFailure { busy = false; error = friendlyError(it) }
    }
    LaunchedEffect(resendIn) { if (resendIn > 0) { delay(1000); resendIn-- } }

    Column(Modifier.fillMaxSize().padding(24.dp)) {
        Spacer(Modifier.height(30.dp))
        Text("کد تأیید", style = MaterialTheme.typography.headlineMedium)
        Text(
            "کد ۶ رقمی ارسال‌شده به ${faDigits(phone)} را وارد کنید",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Spacer(Modifier.height(20.dp))

        // حالت توسعهٔ صادقانه (§22): پیامک واقعی ارسال نشده است
        if (devMode) {
            Surface(color = MaterialTheme.colorScheme.tertiaryContainer, shape = RoundedCornerShape(12.dp)) {
                Text(
                    "حالت توسعه: ارائه‌دهندهٔ پیامک (SMS_PROVIDER) روی سرور پیکربندی نشده است؛ پیامکی ارسال نشده." +
                        (devCode?.let { "\nکد تست: $it" } ?: ""),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onTertiaryContainer,
                    modifier = Modifier.padding(12.dp),
                )
            }
            Spacer(Modifier.height(14.dp))
        }

        OutlinedTextField(
            value = code,
            onValueChange = { v -> code = v.filter { ch -> ch.isDigit() }.take(6) },
            label = { Text("کد ۶ رقمی") },
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.NumberPassword),
            singleLine = true,
            shape = RoundedCornerShape(14.dp),
            modifier = Modifier.fillMaxWidth(),
        )
        Spacer(Modifier.height(16.dp))
        Button(
            onClick = {
                busy = true; error = null
                scope.launch {
                    runCatching { api.otpVerify(OtpVerify(phone, code)) }
                        .onSuccess {
                            busy = false
                            if (it.ok) { session.setUser(it); onVerified() }
                            else error = it.message ?: "کد تأیید صحیح نیست."
                        }
                        .onFailure { busy = false; error = friendlyError(it) }
                }
            },
            enabled = code.length == 6 && !busy,
            shape = RoundedCornerShape(14.dp),
            modifier = Modifier.fillMaxWidth().height(52.dp),
        ) { Text(if (busy) "در حال بررسی…" else "تأیید و ورود") }

        Spacer(Modifier.height(12.dp))
        OutlinedButton(
            onClick = {
                scope.launch {
                    runCatching { api.otpRequest(OtpRequest(phone)) }
                        .onSuccess { r ->
                            devMode = r.demo == true
                            devCode = r.devCode
                            resendIn = 120
                        }
                }
            },
            enabled = resendIn == 0 && !busy,
            modifier = Modifier.fillMaxWidth(),
        ) { Text(if (resendIn > 0) "ارسال مجدد تا ${faDigits(resendIn)} ثانیه" else "ارسال مجدد کد") }

        error?.let {
            Spacer(Modifier.height(10.dp))
            Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodyMedium)
        }
    }
}
