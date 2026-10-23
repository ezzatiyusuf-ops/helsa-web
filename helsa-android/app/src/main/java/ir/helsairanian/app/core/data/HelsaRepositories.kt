package ir.helsairanian.app.core.data

import android.content.Context
import ir.helsairanian.app.core.net.CampaignDto
import ir.helsairanian.app.core.net.CategoryDto
import ir.helsairanian.app.core.net.GiftPackageDto
import ir.helsairanian.app.core.net.ProductDto
import ir.helsairanian.app.core.net.TrayDto
import ir.helsairanian.app.core.net.NetworkModule
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

/**
 * مخزن کاتالوگ — کش در حافظهٔ جلسه + دریافت از سرور.
 * §32: کاتالوگ ۱۸۴تایی در شروع اپ لود نمی‌شود؛ فقط وقتی کاربر وارد کاتالوگ/جستجو شود.
 * منبع حقیقت: همان API سایت. هیچ کاتالوگ موازی/هاردکد در اپ وجود ندارد (§10/§42).
 */
class CatalogRepository(private val context: Context) {
    private val api get() = NetworkModule.api(context)
    private val mutex = Mutex()

    var products: List<ProductDto>? = null
        private set
    var categories: List<CategoryDto>? = null
        private set
    var campaigns: List<CampaignDto>? = null
        private set
    var trays: List<TrayDto>? = null
        private set
    var gifts: List<GiftPackageDto>? = null
        private set

    suspend fun getProducts(force: Boolean = false): List<ProductDto> = mutex.withLock {
        (if (!force) products else null) ?: api.products().products.also { products = it }
    }

    suspend fun getCategories(force: Boolean = false): List<CategoryDto> = mutex.withLock {
        (if (!force) categories else null) ?: api.categories().categories.also { categories = it }
    }

    suspend fun getCampaigns(force: Boolean = false): List<CampaignDto> = mutex.withLock {
        (if (!force) campaigns else null) ?: api.campaigns().campaigns.also { campaigns = it }
    }

    suspend fun getTrays(force: Boolean = false): List<TrayDto> = mutex.withLock {
        (if (!force) trays else null) ?: api.trays().trays.also { trays = it }
    }

    suspend fun getGifts(force: Boolean = false): List<GiftPackageDto> = mutex.withLock {
        (if (!force) gifts else null) ?: api.gifts().packages.also { gifts = it }
    }

    suspend fun getProduct(slug: String): ProductDto? = api.productBySlug(slug).product
}

/** §16: منطق شمارش‌معکوس — همان قانون سایت: فقط ۲۴ ساعت پایانیِ کمپینِ فعالِ در حال برگزاری */
object CampaignMath {
    data class CampaignTiming(val endMillis: Long, val showCountdown: Boolean)

    fun timing(campaigns: List<CampaignDto>, now: Long = System.currentTimeMillis()): CampaignTiming? {
        var soonest: Long? = null
        for (c in campaigns) {
            if (!c.active) continue
            val start = runCatching {
                java.time.LocalDate.parse(c.startDate).atStartOfDay(java.time.ZoneId.systemDefault()).toInstant().toEpochMilli()
            }.getOrNull() ?: continue
            val end = runCatching {
                java.time.LocalDate.parse(c.endDate).atTime(23, 59, 59).atZone(java.time.ZoneId.systemDefault()).toInstant().toEpochMilli()
            }.getOrNull() ?: continue
            if (now < start || now > end) continue
            if (soonest == null || end < soonest) soonest = end
        }
        val s = soonest ?: return null
        val remaining = s - now
        return CampaignTiming(s, remaining > 0 && remaining <= 24 * 60 * 60 * 1000L)
    }

    enum class Phase { ACTIVE, UPCOMING, ENDED, INACTIVE }
    fun phase(c: CampaignDto, now: Long = System.currentTimeMillis()): Phase {
        if (!c.active) return Phase.INACTIVE
        val start = runCatching {
            java.time.LocalDate.parse(c.startDate).atStartOfDay(java.time.ZoneId.systemDefault()).toInstant().toEpochMilli()
        }.getOrNull() ?: return Phase.ENDED
        val end = runCatching {
            java.time.LocalDate.parse(c.endDate).atTime(23, 59, 59).atZone(java.time.ZoneId.systemDefault()).toInstant().toEpochMilli()
        }.getOrNull() ?: return Phase.ENDED
        return when {
            now < start -> Phase.UPCOMING
            now <= end -> Phase.ACTIVE
            else -> Phase.ENDED
        }
    }
}
