package ir.helsairanian.app.core.net

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

private val Context.serverStore by preferencesDataStore("helsa_server")
private val KEY_URL = stringPreferencesKey("base_url")

/**
 * فقط بیلد تست (debug): آدرس سرور از داخل اپ قابل تغییر است — اگر تونل تست عوض شود،
 * کاربر آدرس تازه را در اپ وارد می‌کند (تنظیمات → آیکون سرور در هدر خانه) و بدون
 * بیلد مجدد APK ادامه می‌دهد. در release بی‌اثر است (BASE_URL دامنهٔ تولید).
 * پس از ذخیره، اپ باید یک‌بار بسته و باز شود تا همهٔ کلاینت‌ها با آدرس تازه ساخته شوند.
 */
object ServerConfig {
    @Volatile var override: String? = null
        private set

    fun bootstrap(context: Context) {
        CoroutineScope(SupervisorJob() + Dispatchers.IO).launch {
            runCatching {
                context.serverStore.data.collect { prefs ->
                    override = prefs[KEY_URL]?.takeIf { it.isNotBlank() }
                }
            }
        }
    }

    suspend fun save(context: Context, url: String?) {
        val clean = url?.trim()?.removeSuffix("/")?.takeIf { it.isNotBlank() }
        context.serverStore.edit { prefs ->
            if (clean == null) prefs.remove(KEY_URL) else prefs[KEY_URL] = clean
        }
        override = clean
        NetworkModule.resetApi()
    }
}
