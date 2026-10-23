package ir.helsairanian.app

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import coil.ImageLoader
import coil.ImageLoaderFactory
import coil.disk.DiskCache
import coil.memory.MemoryCache

/**
 * HELSA — اپلیکیشن رسمی اندروید هلسا.
 * معماری: تک‌activity + Compose Navigation؛ داده از همان بک‌اند سایت (منبع حقیقت واحد).
 */
class HelsaApp : Application(), ImageLoaderFactory {

    override fun onCreate() {
        super.onCreate()
        createNotificationChannels()
        ir.helsairanian.app.core.net.ServerConfig.bootstrap(this)
    }

    /** §32 پرفورمنس: کش دیسک/حافظهٔ تصاویر با احترام به هدرهای سرور */
    override fun newImageLoader(): ImageLoader =
        ImageLoader.Builder(this)
            .memoryCache { MemoryCache.Builder(this).maxSizePercent(0.18).build() }
            .diskCache {
                DiskCache.Builder()
                    .directory(cacheDir.resolve("helsa_images"))
                    .maxSizeBytes(96L * 1024 * 1024)
                    .build()
            }
            .respectCacheHeaders(false)
            .crossfade(true)
            .build()

    /** §27 معماری نوتیفیکیشن — کانال‌ها ساخته می‌شوند؛ ارسال push نیازمند پیکربندی تولید است */
    private fun createNotificationChannels() {
        if (android.os.Build.VERSION.SDK_INT < android.os.Build.VERSION_CODES.O) return
        val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        nm.createNotificationChannel(
            NotificationChannel(CHANNEL_ORDERS, "وضعیت سفارش", NotificationManager.IMPORTANCE_HIGH).apply {
                description = "اطلاع‌رسانی ثبت، پرداخت و ارسال سفارش"
            }
        )
        nm.createNotificationChannel(
            NotificationChannel(CHANNEL_OFFERS, "پیشنهادها و کمپین‌ها", NotificationManager.IMPORTANCE_DEFAULT).apply {
                description = "پیشنهادهای ویژه و جشنواره‌های هلسا"
            }
        )
    }

    companion object {
        const val CHANNEL_ORDERS = "helsa_orders"
        const val CHANNEL_OFFERS = "helsa_offers"
    }
}
