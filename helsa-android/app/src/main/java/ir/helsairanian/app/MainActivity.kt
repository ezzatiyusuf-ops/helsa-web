package ir.helsairanian.app

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.unit.LayoutDirection
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import ir.helsairanian.app.navigation.HelsaApp
import ir.helsairanian.app.designsystem.HelsaTheme

/**
 * تک‌Activity — اسپلش رسمی (core-splashscreen: لوگو + پس‌زمینهٔ کرم برند، بدون تأخیر مصنوعی)
 * RTL فارسی در ریشه؛ App Links از intent پارس و به ناوبری Compose هدایت می‌شود.
 */
class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        installSplashScreen()
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            CompositionLocalProvider(LocalLayoutDirection provides LayoutDirection.Rtl) {
                HelsaTheme {
                    HelsaApp(deepLink = intent?.dataString)
                }
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
    }
}
