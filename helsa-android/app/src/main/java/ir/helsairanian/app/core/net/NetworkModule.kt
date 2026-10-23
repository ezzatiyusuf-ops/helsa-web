package ir.helsairanian.app.core.net

import android.content.Context
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import ir.helsairanian.app.BuildConfig
import kotlinx.serialization.json.Json
import okhttp3.Cookie
import okhttp3.CookieJar
import okhttp3.HttpUrl
import okhttp3.HttpUrl.Companion.toHttpUrlOrNull
import okhttp3.Interceptor
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.kotlinx.serialization.asConverterFactory
import java.util.concurrent.TimeUnit

/**
 * لایهٔ شبکه — نکات امنیتی (§30):
 *  • نشست در EncryptedSharedPreferences (هرگز plain SharedPreferences)
 *  • هرگز توکن/رمز در URL یا لاگ release
 *  • CSRF: موتationها Origin دامنهٔ هلسا را می‌فرستند (قرارداد assertSameOrigin بک‌اند)
 *  • timeoutهای محافظه‌کار + retry محدود
 */
object NetworkModule {

    val json = Json {
        ignoreUnknownKeys = true
        coerceInputValues = true
        explicitNulls = false
        encodeDefaults = true
    }

    fun baseUrl(): HttpUrl {
        // بیلد تست: آدرس واردشده در اپ (ServerConfig) اولویت دارد
        ServerConfig.override?.let { u ->
            okhttp3.HttpUrl.Companion.run {
                u.toHttpUrlOrNull()
            }?.let { return it }
        }
        return HttpUrl.Builder()
            .scheme(if (BuildConfig.BASE_URL.startsWith("https")) "https" else "http")
            .host(BuildConfig.BASE_URL.removePrefix("https://").removePrefix("http://").substringBefore('/'))
            .port(if (BuildConfig.BASE_URL.contains(":3000")) 3000 else if (BuildConfig.BASE_URL.startsWith("https")) 443 else 80)
            .build()
    }

    /** با تغییر آدرس سرور، کلاینت‌ها با آدرس تازه ساخته شوند */
    fun resetApi() { api = null }

    /** ذخیره‌ساز امن کوکی نشست (helsa_session امضاشدهٔ سرور) */
    class SecureCookieStore(context: Context) : CookieJar {
        private val prefs = EncryptedSharedPreferences.create(
            context,
            "helsa_secure_session",
            MasterKey.Builder(context).setKeyScheme(MasterKey.KeyScheme.AES256_GCM).build(),
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM,
        )
        private val cache = mutableListOf<Cookie>()

        init {
            // بازیابی نشست از دیسک (رمزگشایی با Keystore سخت‌افزاری)
            for (k in prefs.all.keys) {
                prefs.getString(k, null)?.let { raw ->
                    Cookie.parse(baseUrl(), raw)?.let { cache.add(it) }
                }
            }
        }

        @Synchronized
        override fun loadForRequest(url: HttpUrl): List<Cookie> = cache.filter { it.matches(url) }

        @Synchronized
        override fun saveFromResponse(url: HttpUrl, cookies: List<Cookie>) {
            cookies.forEach { c ->
                cache.removeAll { it.name == c.name }
                cache.add(c)
                prefs.edit().putString(c.name, c.toString()).apply()
            }
        }

        @Synchronized
        fun clear() {
            cache.clear()
            prefs.edit().clear().apply()
        }
    }

    /** Origin دامنهٔ هلسا برای عبور از assertSameOrigin بک‌اند (کلاینت بومی، بدون ریسک CSRF مرورگری) */
    class HelsaOriginInterceptor : Interceptor {
        override fun intercept(chain: Interceptor.Chain): okhttp3.Response {
            val req = chain.request().newBuilder()
                .header("Origin", baseUrl().toString().removeSuffix("/"))
                .header("Referer", baseUrl().toString().removeSuffix("/") + "/")
                .header("X-Helsa-Client", "android/${BuildConfig.VERSION_NAME}")
                .build()
            return chain.proceed(req)
        }
    }

    fun okHttp(context: Context): OkHttpClient = OkHttpClient.Builder()
        .cookieJar(SecureCookieStore(context))
        .addInterceptor(HelsaOriginInterceptor())
        .apply {
            if (BuildConfig.DEBUG) {
                addInterceptor(HttpLoggingInterceptor().apply {
                    level = HttpLoggingInterceptor.Level.BASIC // بدنه/هدر حساس در release هرگز لاگ نمی‌شود
                    redactHeader("Cookie")
                    redactHeader("Set-Cookie")
                })
            }
        }
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(25, TimeUnit.SECONDS)
        .writeTimeout(25, TimeUnit.SECONDS)
        .build()

    fun retrofit(context: Context): Retrofit = Retrofit.Builder()
        .baseUrl(baseUrl())
        .client(okHttp(context))
        .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
        .build()

    @Volatile private var api: HelsaApi? = null
    fun api(context: Context): HelsaApi = api ?: synchronized(this) {
        api ?: retrofit(context.applicationContext).create(HelsaApi::class.java).also { api = it }
    }
}
