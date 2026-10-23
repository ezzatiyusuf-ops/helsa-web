package ir.helsairanian.app.core.session

import android.content.Context
import ir.helsairanian.app.core.net.AuthUser
import ir.helsairanian.app.core.net.NetworkModule
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow

/**
 * نشست کاربر — همان نشست امضاشدهٔ سرور سایت (کوکی helsa_session در ذخیره‌ساز رمزنگاری‌شده).
 * هیچ رمز/توکنی در plain SharedPreferences ذخیره نمی‌شود (§21/§30).
 */
class SessionManager(private val context: Context) {
    private val api get() = NetworkModule.api(context)

    private val _user = MutableStateFlow<AuthUser?>(null)
    val user: StateFlow<AuthUser?> = _user

    suspend fun refresh() {
        runCatching { api.session() }.onSuccess { s ->
            _user.value = if (s.ok) s else null
        }
    }

    fun setUser(u: AuthUser?) { _user.value = u?.takeIf { it.ok } }

    suspend fun logout() {
        runCatching { api.logout() }
        _user.value = null
    }
}

object SessionHolder {
    @Volatile private var mgr: SessionManager? = null
    fun get(context: Context): SessionManager = mgr ?: synchronized(this) {
        mgr ?: SessionManager(context.applicationContext).also { mgr = it }
    }
}
