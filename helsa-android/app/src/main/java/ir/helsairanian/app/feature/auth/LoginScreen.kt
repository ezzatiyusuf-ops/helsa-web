package ir.helsairanian.app.feature.auth

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRow
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import ir.helsairanian.app.core.net.LoginRequest
import ir.helsairanian.app.core.net.NetworkModule
import ir.helsairanian.app.core.session.SessionHolder
import ir.helsairanian.app.core.util.friendlyError
import kotlinx.coroutines.launch

/** §21 ورود — همان بک‌اند سایت: موبایل+OTP (ترجیحی) یا رمز عبور */
@Composable
fun LoginScreen(onOtp: (String) -> Unit, onLoggedIn: () -> Unit) {
    val context = LocalContext.current
    val api = remember { NetworkModule.api(context) }
    val session = SessionHolder.get(context)
    val scope = rememberCoroutineScope()

    var tab by remember { mutableIntStateOf(0) }
    var phone by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }

    val phoneOk = Regex("^09\\d{9}$").matches(phone)

    Column(Modifier.fillMaxSize().padding(24.dp)) {
        Spacer(Modifier.height(30.dp))
        Text("ورود به هلسا", style = MaterialTheme.typography.headlineMedium)
        Text("با حساب هلسای خود وارد شوید — همان حساب سایت", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Spacer(Modifier.height(20.dp))

        TabRow(selectedTabIndex = tab) {
            Tab(selected = tab == 0, onClick = { tab = 0 }, text = { Text("کد یکبارمصرف") })
            Tab(selected = tab == 1, onClick = { tab = 1 }, text = { Text("رمز عبور") })
        }
        Spacer(Modifier.height(18.dp))

        if (tab == 0) {
            OutlinedTextField(
                value = phone,
                onValueChange = { phone = it.filter { c -> c.isDigit() }.take(11) },
                label = { Text("شماره موبایل") },
                placeholder = { Text("09xxxxxxxxx") },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                singleLine = true,
                shape = RoundedCornerShape(14.dp),
                modifier = Modifier.fillMaxWidth(),
            )
            Spacer(Modifier.height(14.dp))
            Button(
                onClick = { onOtp(phone) },
                enabled = phoneOk && !busy,
                shape = RoundedCornerShape(14.dp),
                modifier = Modifier.fillMaxWidth().height(52.dp),
            ) { Text("دریافت کد تأیید") }
            if (!phoneOk && phone.isNotEmpty()) {
                Text("شماره موبایل باید با ۰۹ شروع شود و ۱۱ رقم باشد", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.error, modifier = Modifier.padding(top = 6.dp))
            }
        } else {
            OutlinedTextField(
                value = phone,
                onValueChange = { phone = it },
                label = { Text("موبایل یا ایمیل") },
                singleLine = true,
                shape = RoundedCornerShape(14.dp),
                modifier = Modifier.fillMaxWidth(),
            )
            Spacer(Modifier.height(12.dp))
            OutlinedTextField(
                value = password,
                onValueChange = { password = it },
                label = { Text("رمز عبور") },
                visualTransformation = PasswordVisualTransformation(),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                singleLine = true,
                shape = RoundedCornerShape(14.dp),
                modifier = Modifier.fillMaxWidth(),
            )
            Spacer(Modifier.height(14.dp))
            Button(
                onClick = {
                    busy = true; error = null
                    scope.launch {
                        runCatching { api.login(LoginRequest(phone, password)) }
                            .onSuccess {
                                busy = false
                                if (it.ok) { session.setUser(it); onLoggedIn() }
                                else error = it.message ?: "ورود ناموفق بود."
                            }
                            .onFailure { busy = false; error = friendlyError(it) }
                    }
                },
                enabled = phone.isNotBlank() && password.isNotBlank() && !busy,
                shape = RoundedCornerShape(14.dp),
                modifier = Modifier.fillMaxWidth().height(52.dp),
            ) { Text(if (busy) "در حال ورود…" else "ورود") }
        }
        error?.let {
            Spacer(Modifier.height(10.dp))
            Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodyMedium)
        }
    }
}
