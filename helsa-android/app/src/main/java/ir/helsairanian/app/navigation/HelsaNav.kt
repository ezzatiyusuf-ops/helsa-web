package ir.helsairanian.app.navigation

import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.List
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.ShoppingBasket
import androidx.compose.material.icons.filled.Widgets
import androidx.compose.material3.Badge
import androidx.compose.material3.BadgedBox
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.navigation.navArgument
import androidx.navigation.NavType
import ir.helsairanian.app.core.data.CartHolder
import ir.helsairanian.app.core.util.faDigits
import ir.helsairanian.app.feature.account.AccountScreen
import ir.helsairanian.app.feature.account.OrdersScreen
import ir.helsairanian.app.feature.auth.LoginScreen
import ir.helsairanian.app.feature.auth.OtpScreen
import ir.helsairanian.app.feature.campaigns.CampaignDetailScreen
import ir.helsairanian.app.feature.campaigns.CampaignsScreen
import ir.helsairanian.app.feature.cart.CartScreen
import ir.helsairanian.app.feature.checkout.CheckoutScreen
import ir.helsairanian.app.feature.gifts.GiftsScreen
import ir.helsairanian.app.feature.home.HomeScreen
import ir.helsairanian.app.feature.catalog.CatalogScreen
import ir.helsairanian.app.feature.mazeh.MazehDetailScreen
import ir.helsairanian.app.feature.mazeh.MazehScreen
import ir.helsairanian.app.feature.onboarding.OnboardingScreen
import ir.helsairanian.app.feature.onboarding.KEY_DONE
import ir.helsairanian.app.feature.onboarding.onboardingStore
import ir.helsairanian.app.feature.product.ProductDetailScreen
import ir.helsairanian.app.feature.search.SearchScreen

object Routes {
    const val ONBOARDING = "onboarding"
    const val HOME = "home"
    const val CATALOG = "catalog?cat={cat}"
    const val CATEGORIES = "categories"
    const val PRODUCT = "product/{slug}"
    const val SEARCH = "search"
    const val CART = "cart"
    const val CHECKOUT = "checkout"
    const val LOGIN = "login"
    const val OTP = "otp/{phone}"
    const val ACCOUNT = "account"
    const val ORDERS = "orders"
    const val CAMPAIGNS = "campaigns"
    const val CAMPAIGN = "campaign/{slug}"
    const val GIFTS = "gifts"
    const val MAZEH = "mazeh"
    const val MAZEH_DETAIL = "mazeh/{slug}"

    fun catalog(cat: String? = null) = if (cat.isNullOrBlank()) "catalog" else "catalog?cat=$cat"
    fun product(slug: String) = "product/$slug"
    fun otp(phone: String) = "otp/$phone"
    fun campaign(slug: String) = "campaign/$slug"
    fun mazeh(slug: String) = "mazeh/$slug"

    /** §26 App Link → مسیر داخلی اپ */
    fun fromUrl(url: String?): String? {
        if (url == null) return null
        val path = url.substringAfter("helsairanian.ir/", "").ifEmpty { return null }
        return when {
            path.startsWith("products/") -> product(path.removePrefix("products/").trimEnd('/'))
            path.startsWith("campaigns/") -> campaign(path.removePrefix("campaigns/").trimEnd('/'))
            path.startsWith("mazeh-trays/") -> mazeh(path.removePrefix("mazeh-trays/").trimEnd('/'))
            path == "gifts" -> GIFTS
            path == "cart" -> CART
            path == "products" -> catalog()
            path == "campaigns" -> CAMPAIGNS
            path == "mazeh-trays" -> MAZEH
            path == "search" -> SEARCH
            else -> null
        }
    }
}

private data class BottomItem(val route: String, val label: String, val icon: androidx.compose.ui.graphics.vector.ImageVector)

/** اسکلت اپ: ناوبری پایین با ۵ آیتم ساده (§5) + NavHost + دروازهٔ آنبوردینگ اولین اجرا (§7) */
@Composable
fun HelsaApp(deepLink: String?) {
    val nav = rememberNavController()
    val context = LocalContext.current

    // آنبوردینگ فقط در اولین اجرا؛ تکمیل آن به‌صورت محلی ذخیره می‌شود
    var onboarded by remember { androidx.compose.runtime.mutableStateOf<Boolean?>(null) }
    LaunchedEffect(Unit) {
        runCatching {
            context.onboardingStore.data.collect { prefs -> onboarded = prefs[KEY_DONE] == true }
        }.onFailure { onboarded = true }
    }
    if (onboarded == null) return // یک فریم کوتاه تا خواندن دیسک
    val cart by CartHolder.get(context).state.collectAsState()
    val backstack by nav.currentBackStackEntryAsState()
    val currentRoute = backstack?.destination?.route

    val bottomItems = listOf(
        BottomItem(Routes.HOME, "خانه", Icons.Filled.Home),
        BottomItem("catalog", "محصولات", Icons.Filled.Widgets),
        BottomItem(Routes.CATEGORIES, "دسته‌بندی", Icons.Filled.List),
        BottomItem(Routes.CART, "سبد خرید", Icons.Filled.ShoppingBasket),
        BottomItem(Routes.ACCOUNT, "حساب من", Icons.Filled.Person),
    )
    val showBottom = currentRoute in bottomItems.map { it.route } + listOf(Routes.CATEGORIES, Routes.CATALOG)

    Scaffold(
        bottomBar = {
            if (showBottom) {
                NavigationBar {
                    bottomItems.forEach { item ->
                        NavigationBarItem(
                            selected = currentRoute == item.route,
                            onClick = {
                                nav.navigate(item.route) {
                                    popUpTo(Routes.HOME) { saveState = true }
                                    launchSingleTop = true
                                    restoreState = true
                                }
                            },
                            icon = {
                                if (item.route == Routes.CART && cart.count > 0) {
                                    BadgedBox(badge = { Badge { Text(faDigits(cart.count)) } }) {
                                        Icon(item.icon, contentDescription = item.label)
                                    }
                                } else Icon(item.icon, contentDescription = item.label)
                            },
                            label = { Text(item.label) },
                        )
                    }
                }
            }
        },
    ) { padding ->
        NavHost(
            navController = nav,
            startDestination = if (onboarded == true) Routes.HOME else Routes.ONBOARDING,
            modifier = Modifier.padding(padding),
        ) {
            composable(Routes.ONBOARDING) { OnboardingScreen(onDone = { nav.navigate(Routes.HOME) { popUpTo(Routes.ONBOARDING) { inclusive = true } } }) }
            composable(Routes.HOME) {
                HomeScreen(
                    deepLinkRoute = Routes.fromUrl(deepLink),
                    onOpenRoute = { nav.navigate(it) },
                )
            }
            composable("catalog?cat={cat}", arguments = listOf(navArgument("cat") { type = NavType.StringType; nullable = true; defaultValue = null })) {
                CatalogScreen(onOpenProduct = { nav.navigate(Routes.product(it)) })
            }
            composable(Routes.CATEGORIES) { CatalogScreen(showCategoriesFirst = true, onOpenProduct = { nav.navigate(Routes.product(it)) }) }
            composable(Routes.PRODUCT) { entry ->
                ProductDetailScreen(
                    slug = entry.arguments?.getString("slug").orEmpty(),
                    onBack = { nav.popBackStack() },
                    onOpenProduct = { nav.navigate(Routes.product(it)) },
                )
            }
            composable(Routes.SEARCH) { SearchScreen(onOpenProduct = { nav.navigate(Routes.product(it)) }, onOpenCategory = { nav.navigate(Routes.catalog(it)) }) }
            composable(Routes.CART) { CartScreen(onCheckout = { nav.navigate(Routes.CHECKOUT) }, onContinueShopping = { nav.popBackStack() }) }
            composable(Routes.CHECKOUT) { CheckoutScreen(onDone = { nav.navigate(Routes.ORDERS) { popUpTo(Routes.HOME) } }) }
            composable(Routes.LOGIN) { LoginScreen(onOtp = { nav.navigate(Routes.otp(it)) }, onLoggedIn = { nav.popBackStack() }) }
            composable(Routes.OTP) { entry ->
                OtpScreen(phone = entry.arguments?.getString("phone").orEmpty(), onVerified = { nav.popBackStack() })
            }
            composable(Routes.ACCOUNT) { AccountScreen(onOpenOrders = { nav.navigate(Routes.ORDERS) }, onLogin = { nav.navigate(Routes.LOGIN) }) }
            composable(Routes.ORDERS) { OrdersScreen(onBack = { nav.popBackStack() }) }
            composable(Routes.CAMPAIGNS) { CampaignsScreen(onOpen = { nav.navigate(Routes.campaign(it)) }) }
            composable(Routes.CAMPAIGN) { entry ->
                CampaignDetailScreen(slug = entry.arguments?.getString("slug").orEmpty(), onOpenCatalog = { nav.navigate(Routes.catalog(it)) }, onBack = { nav.popBackStack() })
            }
            composable(Routes.GIFTS) { GiftsScreen(onAddToCartDone = {}) }
            composable(Routes.MAZEH) { MazehScreen(onOpen = { nav.navigate(Routes.mazeh(it)) }) }
            composable(Routes.MAZEH_DETAIL) { entry ->
                MazehDetailScreen(slug = entry.arguments?.getString("slug").orEmpty(), onBack = { nav.popBackStack() })
            }
        }
    }
}
