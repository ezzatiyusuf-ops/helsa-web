package ir.helsairanian.app.core.net

import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

/**
 * HelsaApi — تمام مسیرها روی همان بک‌اند Next.js سایت هلسا.
 * منبع حقیقت واحد: محصولات/قیمت/موجودی/کمپین/سفارش فقط از سرور.
 */
interface HelsaApi {

    // ── کاتالوگ ──
    @GET("api/products")
    suspend fun products(@Query("cat") cat: String? = null): ProductsResponse

    @GET("api/products/featured")
    suspend fun featured(): FeaturedResponse

    @GET("api/products/{slug}")
    suspend fun productBySlug(@Path("slug") slug: String): ProductDetailResponse

    @GET("api/categories")
    suspend fun categories(): CategoriesResponse

    @GET("api/search")
    suspend fun search(@Query("q") q: String): SearchResponse

    // ── کمپین/سینی/هدیه ──
    @GET("api/campaigns")
    suspend fun campaigns(): CampaignsResponse

    @GET("api/trays")
    suspend fun trays(): TraysResponse

    @GET("api/gifts")
    suspend fun gifts(): GiftsResponse

    // ── پرداخت/ارسال ──
    @GET("api/payments/methods")
    suspend fun paymentMethods(@Query("total") total: Int, @Query("province") province: String? = null): PaymentMethodsResponse

    @GET("api/shipping/methods")
    suspend fun shippingMethods(): ShippingMethodsResponse

    // ── احراز هویت (همان سیستم سایت) ──
    @POST("api/auth/login")
    suspend fun login(@Body body: LoginRequest): AuthUser

    @POST("api/auth/otp/request")
    suspend fun otpRequest(@Body body: OtpRequest): OtpRequestResponse

    @POST("api/auth/otp/verify")
    suspend fun otpVerify(@Body body: OtpVerify): AuthUser

    @GET("api/auth/session")
    suspend fun session(): AuthUser

    @POST("api/auth/logout")
    suspend fun logout(): SimpleOk

    // ── سبد/سفارش ──
    @POST("api/cart/check")
    suspend fun cartCheck(@Body items: List<CartCheckItem>): CartCheckResponse

    @POST("api/orders")
    suspend fun createOrder(@Body body: CreateOrderRequest): CreateOrderResponse

    @GET("api/orders")
    suspend fun orders(): OrdersResponse

    // ── پشتیبانی ──
    @POST("api/contact")
    suspend fun contact(@Body body: ContactRequest): SimpleOk
}
