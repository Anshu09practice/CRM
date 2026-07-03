# ProGuard rules for JJ CRM

# ─── Kotlin ──────────────────────────────────────────────────────────────────
-keepattributes *Annotation*, InnerClasses, Signature, EnclosingMethod
-keepattributes RuntimeVisibleAnnotations, RuntimeVisibleParameterAnnotations
-keepattributes Exceptions
-keep class kotlin.Metadata { *; }
-dontwarn kotlin.**
-keepclassmembers class **$WhenMappings { <fields>; }

# ─── Application / Entry Points ──────────────────────────────────────────────
# Keep the entire app package — Hilt generates classes here that R8 doesn't
# know about from annotations alone.
-keep class com.jalanjyothi.crm.** { *; }

# ─── Hilt / Dagger ───────────────────────────────────────────────────────────
-keep class dagger.** { *; }
-keep interface dagger.** { *; }
-keep class javax.inject.** { *; }
-dontwarn dagger.**
-dontwarn javax.inject.**

# Keep all Hilt-generated component and factory classes
-keep class **_HiltComponents* { *; }
-keep class **Hilt_* { *; }
-keep class **_Factory { *; }
-keep class **_GeneratedInjector { *; }
-keep class **_ComponentTreeDeps { *; }
-keepnames @dagger.hilt.android.lifecycle.HiltViewModel class * extends androidx.lifecycle.ViewModel

# ─── Jetpack Compose ─────────────────────────────────────────────────────────
-keep class androidx.compose.** { *; }
-dontwarn androidx.compose.**

# ─── kotlinx.serialization ───────────────────────────────────────────────────
-dontnote kotlinx.serialization.AnnotationsKt
-keep class kotlinx.serialization.** { *; }
-keepclassmembers class kotlinx.serialization.json.** { *** Companion; }
-keepclasseswithmembers class kotlinx.serialization.json.** {
    kotlinx.serialization.KSerializer serializer(...);
}
# Keep @Serializable classes and their generated serializer companions
-keep @kotlinx.serialization.Serializable class * { *; }
-keepclassmembers @kotlinx.serialization.Serializable class ** {
    *** Companion;
    *** INSTANCE;
    kotlinx.serialization.KSerializer serializer(...);
}
# Keep generated $serializer objects (created by the kotlinx.serialization plugin)
-keepclasseswithmembers class **$serializer {
    *** INSTANCE;
    <fields>;
    <methods>;
}

# ─── Retrofit ────────────────────────────────────────────────────────────────
-dontwarn retrofit2.**
-keep class retrofit2.** { *; }
-keepclassmembers,allowshrinking,allowobfuscation interface * {
    @retrofit2.http.* <methods>;
}
# CRITICAL: keep any interface that has Retrofit annotations (preserves generic
# Signature attribute so Retrofit can extract suspend-function response types).
# Without this, R8 strips Continuation<? super T> to a raw type, causing:
#   java.lang.Class cannot be cast to java.lang.reflect.ParameterizedType
-if interface * { @retrofit2.http.* <methods>; }
-keep,allowobfuscation interface <1>
-if interface * { @retrofit2.http.* <methods>; }
-keep,allowobfuscation interface * extends <1>
# Kotlin coroutines - preserve generic signatures for Retrofit suspend support
-keep class kotlin.coroutines.Continuation
-keepattributes Signature, Exceptions
-dontwarn retrofit2.KotlinExtensions
-dontwarn retrofit2.KotlinExtensions$*
-dontwarn kotlin.Unit

# ─── OkHttp ──────────────────────────────────────────────────────────────────
-dontwarn okhttp3.**
-dontwarn okio.**
-keep class okhttp3.** { *; }
-keep interface okhttp3.** { *; }

# ─── Room ────────────────────────────────────────────────────────────────────
-keep class * extends androidx.room.RoomDatabase { *; }
-keep @androidx.room.Entity class * { *; }
-keep @androidx.room.Dao interface * { *; }
-dontwarn androidx.room.**

# ─── DataStore ───────────────────────────────────────────────────────────────
-keep class androidx.datastore.** { *; }
-dontwarn androidx.datastore.**
