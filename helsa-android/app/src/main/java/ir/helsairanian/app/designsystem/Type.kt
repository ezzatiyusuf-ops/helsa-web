package ir.helsairanian.app.designsystem

import androidx.compose.material3.Typography
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp
import ir.helsairanian.app.R

/** تایپوگرافی فارسی برند — وزیرمتن (همان فونت سایت) */
val HelsaFont = FontFamily(
    Font(R.font.vazirmatn_regular, FontWeight.W400),
    Font(R.font.vazirmatn_medium, FontWeight.W500),
    Font(R.font.vazirmatn_semibold, FontWeight.W600),
    Font(R.font.vazirmatn_bold, FontWeight.W700),
)

val HelsaTypography = Typography(
    displaySmall = TextStyle(fontFamily = HelsaFont, fontWeight = FontWeight.W700, fontSize = 30.sp, lineHeight = 40.sp),
    headlineSmall = TextStyle(fontFamily = HelsaFont, fontWeight = FontWeight.W700, fontSize = 22.sp, lineHeight = 30.sp),
    headlineMedium = TextStyle(fontFamily = HelsaFont, fontWeight = FontWeight.W700, fontSize = 26.sp, lineHeight = 34.sp),
    titleLarge = TextStyle(fontFamily = HelsaFont, fontWeight = FontWeight.W700, fontSize = 19.sp, lineHeight = 27.sp),
    titleMedium = TextStyle(fontFamily = HelsaFont, fontWeight = FontWeight.W600, fontSize = 16.sp, lineHeight = 24.sp),
    titleSmall = TextStyle(fontFamily = HelsaFont, fontWeight = FontWeight.W600, fontSize = 13.5.sp, lineHeight = 20.sp),
    bodyLarge = TextStyle(fontFamily = HelsaFont, fontWeight = FontWeight.W400, fontSize = 15.5.sp, lineHeight = 26.sp),
    bodyMedium = TextStyle(fontFamily = HelsaFont, fontWeight = FontWeight.W400, fontSize = 13.5.sp, lineHeight = 23.sp),
    bodySmall = TextStyle(fontFamily = HelsaFont, fontWeight = FontWeight.W400, fontSize = 11.5.sp, lineHeight = 18.sp),
    labelLarge = TextStyle(fontFamily = HelsaFont, fontWeight = FontWeight.W600, fontSize = 14.sp, lineHeight = 20.sp),
    labelMedium = TextStyle(fontFamily = HelsaFont, fontWeight = FontWeight.W600, fontSize = 12.sp, lineHeight = 16.sp),
    labelSmall = TextStyle(fontFamily = HelsaFont, fontWeight = FontWeight.W600, fontSize = 10.5.sp, lineHeight = 14.sp),
)
