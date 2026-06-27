# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# PCI DSS 6.5.5: Obfuscation to prevent reverse engineering

# Capacitor - keep WebView JavaScript interfaces
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Keep Capacitor core (required for plugin bridge)
-keep class com.getcapacitor.** { *; }

# Keep only the MainActivity (narrow scope - PCI DSS compliant)
-keep class com.jalanjyothi.crm.MainActivity { *; }

# Keep AndroidX components referenced in manifest
-keep class androidx.core.content.FileProvider { *; }
-keep class androidx.core.app.** { *; }

# Remove logging in release builds (PCI DSS 10.7 - no sensitive data in logs)
-assumenosideeffects class android.util.Log {
    public static int v(...);
    public static int d(...);
    public static int i(...);
}

# Obfuscation: make reverse engineering harder
-repackageclasses ''
-allowaccessmodification
-optimizationpasses 5

# Preserve line numbers for crash reporting only
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# Remove unused code aggressively
-dontwarn org.apache.cordova.**
