package com.jalanjyothi.crm.data.remote

import android.os.Build
import com.jalanjyothi.crm.data.local.AuthTokenStore
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking
import okhttp3.HttpUrl.Companion.toHttpUrlOrNull
import okhttp3.Interceptor
import okhttp3.Response
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Intercepts every request and replaces the base URL with the one stored in DataStore.
 * This allows changing the server URL at runtime from the Settings screen without
 * rebuilding the APK.
 */
@Singleton
class ServerUrlInterceptor @Inject constructor(
    private val tokenStore: AuthTokenStore,
) : Interceptor {

    override fun intercept(chain: Interceptor.Chain): Response {
        val serverUrl = runBlocking { tokenStore.serverUrl.first() }.trimEnd('/')
        val originalRequest = chain.request()

        val baseUrl = serverUrl.toHttpUrlOrNull()
            ?: return chain.proceed(originalRequest) // fallback — proceed unchanged

        val newUrl = originalRequest.url.newBuilder()
            .scheme(baseUrl.scheme)
            .host(baseUrl.host)
            .port(baseUrl.port)
            .build()

        val newRequest = originalRequest.newBuilder().url(newUrl).build()
        return chain.proceed(newRequest)
    }

    companion object {
        /**
         * Returns the appropriate default server URL based on whether the app is
         * running inside the Android emulator or on a real device.
         *
         * Emulator: host machine's localhost is reachable at 10.0.2.2
         * Real device: uses the PC's WiFi IP
         */
        fun defaultServerUrl(): String {
            val isEmulator = Build.FINGERPRINT.startsWith("sdk_gphone") ||
                Build.FINGERPRINT.startsWith("generic") ||
                Build.MODEL.contains("Emulator") ||
                Build.MODEL.contains("Android SDK built for x86") ||
                Build.MODEL.contains("Android SDK built for arm64") ||
                Build.MANUFACTURER.equals("Genymotion", ignoreCase = true) ||
                Build.HARDWARE.contains("goldfish") ||
                Build.HARDWARE.contains("ranchu") ||
                Build.PRODUCT.startsWith("sdk") ||
                Build.PRODUCT.startsWith("vbox")
            return if (isEmulator) EMULATOR_URL else DEVICE_URL
        }

        const val EMULATOR_URL = "https://10.0.2.2:3001"
        const val DEVICE_URL = ""
    }
}
