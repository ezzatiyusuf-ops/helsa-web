package ir.helsairanian.app

import ir.helsairanian.app.core.data.CampaignMath
import ir.helsairanian.app.core.net.CampaignDto
import ir.helsairanian.app.core.util.faDigits
import ir.helsairanian.app.core.util.faPrice
import ir.helsairanian.app.core.util.gregorianToJalali
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.LocalDate

/** تست‌های واحد — منطق‌های حیاتی: اعداد فارسی، تاریخ شمسی، پنجرهٔ ۲۴ ساعتهٔ کمپین (§16) */
class HelsaUnitTest {

    @Test fun faDigits_تبدیل_ارقام() {
        assertEquals("۱۲۳", faDigits(123))
        assertEquals("۰۹۱۲", faDigits("0912"))
    }

    @Test fun faPrice_جداکننده_هزارگان() {
        assertEquals("۱۸۴٬۰۰۰", faPrice(184_000))
        assertEquals("۰", faPrice(0))
        assertEquals("۱٬۲۰۰٬۰۰۰", faPrice(1_200_000))
    }

    @Test fun jalali_تاریخ_مرجع() {
        // 2026-09-17 = ۲۶ شهریور ۱۴۰۵
        val (y, m, d) = gregorianToJalali(2026, 9, 17)
        assertEquals(1405, y); assertEquals(6, m); assertEquals(26, d)
        // نوروز: 2026-03-21 = ۱ فروردین ۱۴۰۵
        val (y2, m2, d2) = gregorianToJalali(2026, 3, 21)
        assertEquals(1405, y2); assertEquals(1, m2); assertEquals(1, d2)
    }

    @Test fun campaign_window_فقط_۲۴_ساعت_پایانی() {
        val today = LocalDate.now()
        val c = CampaignDto(
            title = "تست", slug = "t", startDate = today.minusDays(3).toString(),
            endDate = today.toString(), active = true,
        )
        val t = CampaignMath.timing(listOf(c))
        assertTrue(t != null && t.showCountdown) // پایان امروز → در پنجره
        // کمپین با پایان ۳ روز بعد → شمارش‌معکوس نباید باشد
        val far = c.copy(endDate = today.plusDays(3).toString())
        val t2 = CampaignMath.timing(listOf(far))
        assertTrue(t2 == null || !t2.showCountdown)
        // کمپین غیرفعال → نادیده
        assertNull(CampaignMath.timing(listOf(c.copy(active = false))))
    }

    @Test fun campaign_phase_واقعی() {
        val today = LocalDate.now()
        assertEquals(CampaignMath.Phase.ACTIVE, CampaignMath.phase(CampaignDto(startDate = today.minusDays(1).toString(), endDate = today.toString(), active = true)))
        assertEquals(CampaignMath.Phase.UPCOMING, CampaignMath.phase(CampaignDto(startDate = today.plusDays(1).toString(), endDate = today.plusDays(2).toString(), active = true)))
        assertEquals(CampaignMath.Phase.ENDED, CampaignMath.phase(CampaignDto(startDate = today.minusDays(10).toString(), endDate = today.minusDays(1).toString(), active = true)))
        assertEquals(CampaignMath.Phase.INACTIVE, CampaignMath.phase(CampaignDto(startDate = today.minusDays(1).toString(), endDate = today.toString(), active = false)))
    }

    @Test fun idempotency_کلید_یکتا() {
        val keys = (1..100).map { java.util.UUID.randomUUID().toString() }.toSet()
        assertEquals(100, keys.size)
        assertFalse(keys.any { it.length < 8 })
    }
}
