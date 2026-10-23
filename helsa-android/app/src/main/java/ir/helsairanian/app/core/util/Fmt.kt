package ir.helsairanian.app.core.util

import java.time.LocalDate
import java.time.format.DateTimeFormatter

/** قالب‌بندی فارسی — همسان با قرارداد سایت: اعداد فارسی + تومان */

private val FA_DIGITS = charArrayOf('۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹')

fun faDigits(input: String): String = buildString(input.length) {
    for (c in input) append(if (c in '0'..'9') FA_DIGITS[c - '0'] else c)
}

fun faDigits(n: Int): String = faDigits(n.toString())
fun faDigits(n: Long): String = faDigits(n.toString())
fun faDigits(n: Double): String = faDigits("%.1f".format(n))

/** قیمت با جداکنندهٔ هزارگان + ارقام فارسی (بدون واحد — واحد جداگانه «تومان») */
fun faPrice(n: Int): String {
    val s = StringBuilder()
    var neg = n < 0
    var v = if (neg) -n.toLong() else n.toLong()
    if (v == 0L) return "۰"
    var i = 0
    while (v > 0) {
        s.append((v % 10).toString())
        v /= 10
        i++
        if (i % 3 == 0 && v > 0) s.append('٬')
    }
    return (if (neg) "−" else "") + faDigits(s.reverse().toString())
}

fun toman(n: Int): String = faPrice(n)

/** تاریخ میلادی ISO (yyyy-MM-dd) → شمسی خوانا */
fun jalaliDate(iso: String): String = try {
    val d = LocalDate.parse(iso.substringBefore("T"), DateTimeFormatter.ISO_LOCAL_DATE)
    val (jy, jm, jd) = gregorianToJalali(d.year, d.monthValue, d.dayOfMonth)
    val months = arrayOf("فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند")
    "${faDigits(jd)} ${months[jm - 1]} ${faDigits(jy)}"
} catch (e: Exception) {
    iso.substringBefore("T")
}

/** الگوریتم کلاسیک تبدیل میلادی→جلالی (jalaali-js) */
fun gregorianToJalali(gy0: Int, gm: Int, gd: Int): Triple<Int, Int, Int> {
    val gdm = intArrayOf(0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334)
    var gy = gy0
    var jy = if (gy > 1600) { gy -= 1600; 979 } else { gy -= 621; 0 }
    var days = 365 * gy + (gy + 3) / 4 - (gy + 99) / 100 + (gy + 399) / 400 - 80 + gd + gdm[gm - 1]
    jy += 33 * (days / 12053); days %= 12053
    jy += 4 * (days / 1461); days %= 1461
    if (days > 365) { jy += (days - 1) / 365; days = (days - 1) % 365 }
    val jm = if (days < 186) 1 + days / 31 else 7 + (days - 186) / 30
    val jd = if (days < 186) 1 + days % 31 else 1 + (days - 186) % 30
    return Triple(jy, jm, jd)
}
