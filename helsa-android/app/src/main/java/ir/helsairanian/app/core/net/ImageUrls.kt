package ir.helsairanian.app.core.net

/**
 * مسیرهای تصویر نسبی سایت (/images/opt/...) → URL کامل بر پایهٔ BASE_URL.
 * API سایت مسیر نسبی برمی‌گرداند؛ Coil به URL مطلق نیاز دارد.
 */
object ImageUrls {
    private val base: String get() = NetworkModule.baseUrl().toString().removeSuffix("/")

    fun resolve(path: String?): String = when {
        path.isNullOrBlank() -> ""
        path.startsWith("http") -> path
        else -> base + if (path.startsWith("/")) path else "/$path"
    }
}

val ProductDto.imageFull: String get() = ImageUrls.resolve(image)
val CategoryDto.imageFull: String get() = ImageUrls.resolve(image)
val TrayDto.imageFull: String get() = ImageUrls.resolve(image)
val GiftPackageDto.imageFull: String get() = ImageUrls.resolve(image)
