package ir.helsairanian.app.designsystem

import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.ui.graphics.Color

/**
 * پالت برند — دقیقاً از توکن‌های سایت (globals.css):
 * brand-primary #0B5F3B · dark #08422C · secondary(زیتونی) #2E5A23 ·
 * accent(نارنجی سوخته) #E06A00 · gold #B3922F · cream #FAF7F0 · background #FFFDF9
 */
object HelsaPalette {
    val Primary = Color(0xFF0B5F3B)
    val PrimaryDark = Color(0xFF08422C)
    val Secondary = Color(0xFF2E5A23)
    val Accent = Color(0xFFE06A00)
    val Gold = Color(0xFFB3922F)
    val Cream = Color(0xFFFAF7F0)
    val Background = Color(0xFFFFFDF9)
    val Ink = Color(0xFF1F2A24)
    val GoldContainer = Color(0xFFF6EEDA)
    val GreenContainer = Color(0xFFDFF0E6)
    val SurfaceVariant = Color(0xFFF5F1E8)
    val Outline = Color(0xFFC9CFC5)
}

val HelsaLightColors = lightColorScheme(
    primary = HelsaPalette.Primary,
    onPrimary = Color.White,
    primaryContainer = HelsaPalette.GreenContainer,
    onPrimaryContainer = HelsaPalette.PrimaryDark,
    secondary = HelsaPalette.Secondary,
    onSecondary = Color.White,
    secondaryContainer = Color(0xFFE4EDDD),
    onSecondaryContainer = Color(0xFF1E3D17),
    tertiary = HelsaPalette.Gold,
    onTertiary = Color.White,
    tertiaryContainer = HelsaPalette.GoldContainer,
    onTertiaryContainer = Color(0xFF5C4A12),
    background = HelsaPalette.Background,
    onBackground = HelsaPalette.Ink,
    surface = Color.White,
    onSurface = HelsaPalette.Ink,
    surfaceVariant = HelsaPalette.SurfaceVariant,
    onSurfaceVariant = Color(0xFF4A5450),
    outline = HelsaPalette.Outline,
    outlineVariant = Color(0xFFE4E0D4),
    error = Color(0xFFBA1A1A),
    onError = Color.White,
    errorContainer = Color(0xFFFFDAD6),
    onErrorContainer = Color(0xFF410002),
)

val HelsaDarkColors = darkColorScheme(
    primary = Color(0xFF7DBB9A),
    onPrimary = Color(0xFF06301E),
    primaryContainer = Color(0xFF0B4A2F),
    onPrimaryContainer = Color(0xFFDFF0E6),
    secondary = Color(0xFFB3CCA5),
    onSecondary = Color(0xFF1F3416),
    tertiary = Color(0xFFD8C48D),
    onTertiary = Color(0xFF3A2F0A),
    background = Color(0xFF101712),
    onBackground = Color(0xFFDFE4DD),
    surface = Color(0xFF161E18),
    onSurface = Color(0xFFDFE4DD),
    surfaceVariant = Color(0xFF222B23),
    onSurfaceVariant = Color(0xFFC0C9BD),
    outline = Color(0xFF8A9388),
)
