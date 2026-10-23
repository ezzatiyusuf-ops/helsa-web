package ir.helsairanian.app.feature.onboarding

import android.content.Context
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.preferencesDataStore
import coil.compose.AsyncImage
import ir.helsairanian.app.R
import ir.helsairanian.app.designsystem.HelsaPalette
import kotlinx.coroutines.launch

val Context.onboardingStore by preferencesDataStore("helsa_onboarding")
val KEY_DONE = booleanPreferencesKey("done")

/** §7 آنبوردینگ اختیاری — حداکثر ۳ صفحه + «رد کردن»؛ تکمیل به‌صورت محلی ذخیره می‌شود */
@Composable
fun OnboardingScreen(onDone: () -> Unit) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val pages = listOf(
        Triple(R.drawable.ic_splash_logo, "طعم اصیل ایران", "از باغ‌های جنوب تا سفرهٔ شما — دست‌چینِ طبیعت ایران."),
        Triple(R.drawable.ic_splash_logo, "انتخابی برای هر سلیقه", "خرما، آجیل، خشکبار، سینی مزه و هدایای سازمانی."),
        Triple(R.drawable.ic_splash_logo, "هلسا، همیشه همراه سفره شما", "چون شما لایق بهترین‌ها هستید…"),
    )
    var index = androidx.compose.runtime.remember { androidx.compose.runtime.mutableIntStateOf(0) }

    fun finish() {
        scope.launch {
            context.onboardingStore.edit { it[KEY_DONE] = true }
            onDone()
        }
    }

    Column(
        Modifier.fillMaxSize().background(HelsaPalette.Cream).padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                AsyncImage(model = pages[index.intValue].first, contentDescription = "لوگوی هلسا", modifier = Modifier.size(120.dp))
                Spacer(Modifier.height(28.dp))
                Text(pages[index.intValue].second, style = MaterialTheme.typography.headlineMedium, color = HelsaPalette.PrimaryDark)
                Spacer(Modifier.height(10.dp))
                Text(
                    pages[index.intValue].third,
                    style = MaterialTheme.typography.bodyLarge,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
        Spacer(Modifier.height(36.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            repeat(pages.size) { i ->
                Box(
                    Modifier.size(if (i == index.intValue) 22.dp else 8.dp, 8.dp).clip(CircleShape)
                        .background(if (i == index.intValue) HelsaPalette.Primary else HelsaPalette.Outline)
                )
            }
        }
        Spacer(Modifier.weight(1f))
        Button(onClick = { if (index.intValue < pages.size - 1) index.intValue++ else finish() }, modifier = Modifier.fillMaxWidth().height(52.dp)) {
            Text(if (index.intValue < pages.size - 1) "ادامه" else "شروع خرید")
        }
        Spacer(Modifier.height(10.dp))
        OutlinedButton(onClick = { finish() }, modifier = Modifier.fillMaxWidth()) { Text("رد کردن") }
        Spacer(Modifier.height(8.dp))
        Text("HELSA Organic Products", style = MaterialTheme.typography.labelSmall, color = HelsaPalette.Gold)
    }
}
