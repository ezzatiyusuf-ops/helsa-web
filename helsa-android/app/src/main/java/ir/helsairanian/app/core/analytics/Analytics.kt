package ir.helsairanian.app.core.analytics

import android.util.Log
import ir.helsairanian.app.BuildConfig

/**
 * §36 معماری تحلیل — رخدادهای تجاری معنادار، بدون دادهٔ شخصی غیرضروری.
 * پیاده‌سازی فعلی: لاگ فقط در debug (هیچ ارسال واقعی — ارائه‌دهنده باید در تولید پیکربندی شود).
 * وقتی ارائه‌دهنده (مثلاً GTM/Firebase) پیکربندی شد، فقط این impl عوض می‌شود؛ فراخوان‌ها ثابت می‌مانند.
 */
interface Analytics {
    fun track(event: String, params: Map<String, Any?> = emptyMap())

    companion object Events {
        const val APP_OPEN = "app_open"
        const val VIEW_PRODUCT = "view_product"
        const val SEARCH = "search"
        const val ADD_TO_CART = "add_to_cart"
        const val REMOVE_FROM_CART = "remove_from_cart"
        const val BEGIN_CHECKOUT = "begin_checkout"
        const val PURCHASE = "purchase"
        const val VIEW_CAMPAIGN = "view_campaign"
        const val VIEW_GIFT = "view_gift"
        const val VIEW_MAZEH = "view_mazeh"
        const val LOGIN = "login"
        const val REGISTER = "register"
        const val WISHLIST_ADD = "wishlist_add"
    }
}

class HelsaAnalytics : Analytics {
    override fun track(event: String, params: Map<String, Any?>) {
        if (BuildConfig.DEBUG) Log.d("HelsaAnalytics", "$event $params")
        // تولید: ارسال به ارائه‌دهندهٔ پیکربندی‌شده (§48E — نیازمند پیکربندی تولید)
    }
}
