package ir.helsairanian.app.core.net

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/**
 * DTOها — دقیقاً منطبق بر JSONهای واقعی بک‌اند هلسا (بررسی‌شده روی سرور زنده).
 * فیلدهای ناشناخته نادیده گرفته می‌شوند (ignoreUnknownKeys) تا سازگاری رو به جلو حفظ شود.
 * قیمت‌ها همیشه تومان و صحیح‌اند (همان قرارداد سایت).
 */

@Serializable
data class ProductDto(
    val id: Int = 0,
    val name: String = "",
    val slug: String = "",
    val category: String = "",
    val sku: String? = null,
    val shortDescription: String = "",
    val price: Int = 0,
    val weight: String = "",
    val oldPrice: Int? = null,
    val discount: Int = 0,
    val image: String = "",
    val gallery: List<String> = emptyList(),
    val description: String = "",
    val rating: Double = 0.0,
    val reviews: Int = 0,
    val stock: Int = 0,
    val stockStatus: String = "in_stock",
    val lowStockThreshold: Int = 3,
    val minOrderQty: Int = 1,
    val maxOrderQty: Int = 99,
    val isFeatured: Boolean = false,
    val badge: String? = null,
    val tags: List<String> = emptyList(),
    val variants: List<VariantDto> = emptyList(),
    val features: List<FeatureDto> = emptyList(),
    val nutrition: List<NutritionDto> = emptyList(),
    val storage: String = "",
    val packaging: String = "",
    val ingredients: String = "",
    val origin: String = "",
    val unit: String = "",
    val imageAlt: String = "",
    val allergens: List<String> = emptyList(),
)

@Serializable
data class VariantDto(
    val id: Int = 0,
    val name: String = "",
    val sku: String? = null,
    val price: Int = 0,
    val compareAtPrice: Int? = null,
    val stock: Int = 0,
    val weight: String = "",
    val unit: String = "",
    val flavor: String? = null,
    val isActive: Boolean = true,
)

@Serializable
data class FeatureDto(val label: String = "", val value: String = "")

@Serializable
data class NutritionDto(val label: String = "", val value: String = "", val per: String = "")

@Serializable
data class CategoryDto(
    val id: Int = 0,
    val name: String = "",
    val slug: String = "",
    val description: String = "",
    val shortDescription: String = "",
    val image: String = "",
    val imageAlt: String = "",
    val icon: String? = null,
    val sortOrder: Int = 0,
)

@Serializable
data class TrayContentDto(val title: String = "", val section: String = "", val qty: Int = 0)

@Serializable
data class TrayDto(
    val id: Int = 0,
    val name: String = "",
    val slug: String = "",
    val shortDescription: String = "",
    val description: String = "",
    val image: String = "",
    val imageAlt: String = "",
    val basePrice: Int = 0,
    val oldPrice: Int? = null,
    val size: String = "",
    val servesMin: Int = 0,
    val servesMax: Int = 0,
    val stock: Int = 0,
    val featured: Boolean = false,
    val active: Boolean = true,
    val sku: String? = null,
    val contents: List<TrayContentDto> = emptyList(),
    val occasions: List<String> = emptyList(),
)

@Serializable
data class GiftPackageDto(
    val id: Int = 0,
    val name: String = "",
    val slug: String = "",
    val description: String = "",
    val image: String = "",
    val imageAlt: String = "",
    val kind: String = "gift",
    val basePrice: Int = 0,
    val oldPrice: Int? = null,
    val minQty: Int = 1,
    val maxQty: Int = 10,
    val isFeatured: Boolean = false,
    val isActive: Boolean = true,
    val occasions: List<String> = emptyList(),
    val contents: List<String> = emptyList(),
)

@Serializable
data class CampaignDto(
    val id: Int = 0,
    val title: String = "",
    val slug: String = "",
    val banner: String = "",
    val description: String = "",
    val startDate: String = "",
    val endDate: String = "",
    val discount: Int = 0,
    val category: String = "all",
    val active: Boolean = true,
)

@Serializable
data class PaymentMethodDto(
    val id: String = "",
    val label: String = "",
    val short: String = "",
    val mode: String = "auto",
    val note: String = "",
    val enabled: Boolean = true,
)

@Serializable
data class ShippingMethodDto(
    val code: String = "",
    val label: String = "",
    val description: String = "",
    val estimatedTime: String = "",
    val price: Int = 0,
)

// ── پوشش‌های پاسخ ──
@Serializable data class ProductsResponse(val ok: Boolean = false, val products: List<ProductDto> = emptyList())
@Serializable data class FeaturedResponse(val ok: Boolean = false, val items: List<ProductDto> = emptyList())
@Serializable data class ProductDetailResponse(val ok: Boolean = false, val product: ProductDto? = null, val related: List<ProductDto> = emptyList())
@Serializable data class CategoriesResponse(val ok: Boolean = false, val categories: List<CategoryDto> = emptyList())
@Serializable data class TraysResponse(val ok: Boolean = false, val trays: List<TrayDto> = emptyList())
@Serializable data class GiftsResponse(val ok: Boolean = false, val packages: List<GiftPackageDto> = emptyList())
@Serializable data class CampaignsResponse(val ok: Boolean = false, val campaigns: List<CampaignDto> = emptyList())
@Serializable data class PaymentMethodsResponse(val ok: Boolean = false, val sandbox: Boolean = false, val methods: List<PaymentMethodDto> = emptyList())
@Serializable data class ShippingMethodsResponse(val ok: Boolean = false, val methods: List<ShippingMethodDto> = emptyList())

@Serializable
data class SearchResultDto(
    val name: String = "",
    val slug: String = "",
    val image: String = "",
    val price: Int? = null,
    val category: String? = null,
    val kind: String? = null,
    val stock: Int? = null,
    val sku: String? = null,
)

@Serializable
data class SearchResponse(
    val results: List<SearchResultDto> = emptyList(),
    val categories: List<SearchResultDto> = emptyList(),
    val trays: List<SearchResultDto> = emptyList(),
    val blog: List<SearchResultDto> = emptyList(),
)

// ── احراز هویت (همان بک‌اند سایت) ──
@Serializable data class LoginRequest(val identifier: String, val password: String, val remember: Boolean = true)
@Serializable data class AuthUser(val ok: Boolean = false, val name: String? = null, val phone: String? = null, val email: String? = null, val message: String? = null)
@Serializable data class OtpRequest(val phone: String)
@Serializable data class OtpVerify(val phone: String, val code: String)
@Serializable data class OtpRequestResponse(
    val ok: Boolean = false,
    val message: String? = null,
    val demo: Boolean? = null,
    val devHint: String? = null,
    val devCode: String? = null,
    val expiresAt: String? = null,
)
@Serializable data class SimpleOk(val ok: Boolean = false, val message: String? = null)

// ── سبد/سفارش ──
@Serializable
data class CartCheckItem(
    val key: String,
    val kind: String,
    val id: Int? = null,
    val qty: Int,
    val price: Int,
)

@Serializable
data class CartCheckResponse(
    val ok: Boolean = false,
    val items: List<CartCheckItemResult> = emptyList(),
    val message: String? = null,
)

@Serializable
data class CartCheckItemResult(
    val key: String = "",
    val price: Int = 0,
    val stock: Int = 0,
    val status: String = "",
    val lowStock: Boolean = false,
)

@Serializable
data class OrderAddress(
    val province: String,
    val city: String,
    val full: String,
    val postal: String,
    val plate: String = "",
    val unit: String = "",
    val recipient: String,
    val phone: String,
    val label: String = "منزل",
)

@Serializable
data class OrderCustomer(val firstName: String, val lastName: String, val mobile: String, val email: String = "")

@Serializable
data class OrderItem(
    val key: String,
    val qty: Int,
    val name: String? = null,
    val price: Int? = null,
    val image: String? = null,
    val weight: String? = null,
    val meta: String? = null,
)

@Serializable
data class CreateOrderRequest(
    val customer: OrderCustomer,
    val address: OrderAddress,
    val items: List<OrderItem>,
    val couponCode: String? = null,
    val shippingMethod: String,
    val paymentMethod: String,
    val idempotencyKey: String,
    val subtotal: Int? = null,
    val discount: Int? = null,
    val shipping: Int? = null,
    val total: Int? = null,
    val note: String? = null,
    val isGift: Boolean = false,
    val giftRecipient: String? = null,
    val giftMessage: String? = null,
    val giftPackaging: Boolean = false,
)

@Serializable
data class CreateOrderResponse(
    val ok: Boolean = false,
    val code: String? = null,
    val total: Int? = null,
    val paymentUrl: String? = null,
    val message: String? = null,
)

@Serializable
data class OrderSummaryDto(
    val id: Int = 0,
    val code: String = "",
    val total: Int = 0,
    val status: String = "pending",
    val paymentStatus: String = "pending",
    val createdAt: String = "",
    val items: List<OrderItemSnapshot> = emptyList(),
)

@Serializable
data class OrderItemSnapshot(
    val name: String = "",
    val qty: Int = 1,
    val unitPrice: Int = 0,
    val image: String? = null,
    val itemType: String = "product",
)

@Serializable
data class OrdersResponse(val ok: Boolean = false, val orders: List<OrderSummaryDto> = emptyList(), val message: String? = null)

@Serializable
data class ContactRequest(val name: String, val mobile: String, val subject: String, val message: String)
