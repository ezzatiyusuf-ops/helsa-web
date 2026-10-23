# Helsa Android — قواعد R8
-keepattributes *Annotation*, InnerClasses
-dontnote kotlinx.serialization.**

# kotlinx-serialization
-keepclassmembers class kotlinx.serialization.json.** { *** Companion; }
-keepclasseswithmembers class kotlinx.serialization.json.** { kotlinx.serialization.KSerializer serializer(...); }
-keep,includedescriptorclasses class ir.helsairanian.app.**$$serializer { *; }
-keepclassmembers class ir.helsairanian.app.** { *** Companion; }
-keepclasseswithmembers class ir.helsairanian.app.** { kotlinx.serialization.KSerializer serializer(...); }

# Retrofit
-keepattributes Signature, Exceptions
-keepclassmembers,allowshrinking,allowobfuscation interface * { @retrofit2.http.* <methods>; }
-dontwarn org.codehaus.mojo.animal_sniffer.IgnoreJRERequirement
-dontwarn javax.annotation.**
-dontwarn kotlin.Unit
-dontwarn retrofit2.KotlinExtensions*
-if interface * { @retrofit2.http.* <methods>; }
-keep,allowobfuscation interface <1>

# Tink (security-crypto) — annotationهای compile-only ارجاعی؛ بی‌خطر
-dontwarn com.google.errorprone.annotations.**
-dontwarn com.google.api.client.**
-dontwarn org.joda.time.**
-dontwarn org.bouncycastle.**
-dontwarn com.google.protobuf.**
