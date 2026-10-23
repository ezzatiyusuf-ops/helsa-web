package ir.helsairanian.app.core.util

/** وضعیت‌های استاندارد هر فراخوانی (§29): loading / success / empty / error — پیام‌ها فارسی و انسانی */
sealed interface UiState<out T> {
    data object Loading : UiState<Nothing>
    data object Empty : UiState<Nothing>
    data class Ready<T>(val data: T) : UiState<T>
    data class Error(val message: String = "در دریافت اطلاعات مشکلی پیش آمد. دوباره تلاش کنید.") : UiState<Nothing>
}

/** پیام فارسیِ انسانی برای خطاهای شبکه (بدون افشای خطای خام فنی) */
fun friendlyError(t: Throwable): String = when {
    t is retrofit2.HttpException -> when (t.code()) {
        401 -> "برای این کار وارد حساب کاربری شوید."
        403 -> "درخواست شما پذیرفته نشد. دوباره تلاش کنید."
        404 -> "موردی که دنبالش بودید پیدا نشد."
        429 -> "تعداد درخواست‌ها زیاد است؛ کمی صبر کنید."
        in 500..599 -> "سرویس هلسا در دسترس نیست. کمی بعد دوباره تلاش کنید."
        else -> "در دریافت اطلاعات مشکلی پیش آمد. دوباره تلاش کنید."
    }
    t is java.io.IOException -> "اتصال اینترنت برقرار نیست."
    else -> "در دریافت اطلاعات مشکلی پیش آمد. دوباره تلاش کنید."
}
