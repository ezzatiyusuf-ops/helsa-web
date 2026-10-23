package ir.helsairanian.app.feature.campaigns

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import ir.helsairanian.app.core.data.CampaignMath
import ir.helsairanian.app.core.data.CatalogRepository
import ir.helsairanian.app.core.net.CampaignDto
import ir.helsairanian.app.core.util.UiState
import ir.helsairanian.app.core.util.faDigits
import ir.helsairanian.app.core.util.friendlyError
import ir.helsairanian.app.core.util.jalaliDate
import ir.helsairanian.app.designsystem.EmptyState
import ir.helsairanian.app.designsystem.ErrorState
import ir.helsairanian.app.designsystem.LoadingState
import ir.helsairanian.app.designsystem.SectionHeader

/** §17 کمپین‌ها — فعال/به‌زودی/پایان‌یافته با وضعیت واقعی از تاریخ‌های سرور */
@Composable
fun CampaignsScreen(onOpen: (String) -> Unit) {
    val context = LocalContext.current
    val repo = remember { CatalogRepository(context) }
    var state by remember { mutableStateOf<UiState<List<CampaignDto>>>(UiState.Loading) }

    LaunchedEffect(Unit) {
        try {
            val list = repo.getCampaigns(force = true)
            state = if (list.isEmpty()) UiState.Empty else UiState.Ready(list)
        } catch (t: Throwable) { state = UiState.Error(friendlyError(t)) }
    }

    LazyColumn(Modifier.fillMaxSize().padding(16.dp), contentPadding = PaddingValues(bottom = 16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item { Text("کمپین‌های هلسا", style = MaterialTheme.typography.headlineSmall) }

        when (val s = state) {
            is UiState.Loading -> item { LoadingState() }
            is UiState.Error -> item { ErrorState(s.message) }
            UiState.Empty -> item { EmptyState("فعلاً کمپینی فعال نیست") }
            is UiState.Ready -> {
                val data = s.data
                val active = data.filter { CampaignMath.phase(it) == CampaignMath.Phase.ACTIVE }
                val upcoming = data.filter { CampaignMath.phase(it) == CampaignMath.Phase.UPCOMING }
                val ended = data.filter { CampaignMath.phase(it) == CampaignMath.Phase.ENDED }

                if (active.isNotEmpty()) {
                    item { SectionHeader("در حال برگزاری", "جشنواره‌های فعال") }
                    items(active, key = { "a${it.id}" }) { CampaignRow(it, onOpen) }
                }
                if (upcoming.isNotEmpty()) {
                    item { SectionHeader("به‌زودی") }
                    items(upcoming, key = { "u${it.id}" }) { CampaignRow(it, onOpen) }
                }
                if (ended.isNotEmpty()) {
                    item { SectionHeader("پایان‌یافته") }
                    items(ended, key = { "e${it.id}" }) { CampaignRow(it, onOpen) }
                }
            }
        }
    }
}

@Composable
private fun CampaignRow(c: CampaignDto, onOpen: (String) -> Unit) {
    val phase = CampaignMath.phase(c)
    val label = when (phase) {
        CampaignMath.Phase.ACTIVE -> "در حال برگزاری"
        CampaignMath.Phase.UPCOMING -> "به‌زودی"
        CampaignMath.Phase.ENDED -> "پایان‌یافته"
        CampaignMath.Phase.INACTIVE -> "غیرفعال"
    }
    Surface(
        onClick = { onOpen(c.slug) },
        shape = RoundedCornerShape(16.dp),
        color = if (phase == CampaignMath.Phase.ACTIVE) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surface,
        border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant),
    ) {
        Column(Modifier.padding(14.dp)) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Text(c.title, style = MaterialTheme.typography.titleMedium)
                Surface(shape = RoundedCornerShape(8.dp), color = MaterialTheme.colorScheme.surfaceVariant) {
                    Text(label, style = MaterialTheme.typography.labelSmall, modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp))
                }
            }
            if (c.description.isNotBlank()) {
                Spacer(Modifier.height(4.dp))
                Text(c.description, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 2)
            }
            Spacer(Modifier.height(8.dp))
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text("${jalaliDate(c.startDate)} تا ${jalaliDate(c.endDate)}", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                if (c.discount > 0) Text("تا ٪${faDigits(c.discount)} تخفیف", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.primary)
            }
        }
    }
}

/** جزئیات کمپین — محصولاتِ مرتبط از کاتالوگ واقعی (فیلتر دستهٔ کمپین) */
@Composable
fun CampaignDetailScreen(slug: String, onOpenCatalog: (String?) -> Unit, onBack: () -> Unit) {
    val context = LocalContext.current
    val repo = remember { CatalogRepository(context) }
    var campaign by remember { mutableStateOf<CampaignDto?>(null) }
    var loading by remember { mutableStateOf(true) }

    LaunchedEffect(slug) {
        campaign = repo.getCampaigns().firstOrNull { it.slug == slug }
        loading = false
    }

    Column(Modifier.fillMaxSize().padding(16.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "بازگشت") }
            Text(campaign?.title ?: "کمپین", style = MaterialTheme.typography.titleLarge)
        }
        if (loading) { LoadingState(); return }
        val c = campaign ?: run { ErrorState("این کمپین پیدا نشد.", onBack); return }

        Spacer(Modifier.height(8.dp))
        if (c.description.isNotBlank()) Text(c.description, style = MaterialTheme.typography.bodyLarge, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Spacer(Modifier.height(8.dp))
        Text(
            "${jalaliDate(c.startDate)} تا ${jalaliDate(c.endDate)}" + if (c.discount > 0) " · تا ٪${faDigits(c.discount)} تخفیف" else "",
            style = MaterialTheme.typography.bodyMedium,
        )
        Spacer(Modifier.height(14.dp))
        androidx.compose.material3.Button(
            onClick = { onOpenCatalog(if (c.category != "all") c.category else null) },
            shape = RoundedCornerShape(12.dp),
            modifier = Modifier.fillMaxWidth(),
        ) { Text("مشاهدهٔ محصولات این کمپین") }
    }
}
