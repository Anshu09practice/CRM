package com.jalanjyothi.crm.data.remote

import android.os.Build
import com.jalanjyothi.crm.data.local.AuthTokenStore
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import okhttp3.HttpUrl.Companion.toHttpUrlOrNull
import okhttp3.Interceptor
import okhttp3.Response
import com.jalanjyothi.crm.AppLogger
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Intercepts every request and replaces the base URL with the one stored in DataStore.
 * This allows changing the server URL at runtime from the Settings screen without
 * rebuilding the APK.
 *
 * The server URL is cached in a @Volatile field updated by a coroutine collector so
 * intercept() never calls runBlocking on the OkHttp thread (which can deadlock on
 * low-end devices when the IO dispatcher is saturated).
 */
@Singleton
class ServerUrlInterceptor @Inject constructor(
    private val tokenStore: AuthTokenStore,
) : Interceptor {

    // Initialised to the emulator/device default; updated whenever DataStore changes.
    @Volatile private var cachedUrl: String = defaultServerUrl()

    init {
        CoroutineScope(SupervisorJob() + Dispatchers.IO).launch {
            tokenStore.serverUrl.collect { url ->
                if (url != cachedUrl) {
                    AppLogger.i("Network", "Server URL updated: '${url.ifBlank { "<empty — offline mode>" }}'")
                }
                cachedUrl = url
            }
        }
    }

    override fun intercept(chain: Interceptor.Chain): Response {
        val serverUrl = cachedUrl.trimEnd('/')
        val originalRequest = chain.request()

        val baseUrl = serverUrl.toHttpUrlOrNull()
        if (baseUrl == null) {
            AppLogger.w("Network", "No valid server URL ('$serverUrl') — request proceeding with placeholder base URL. " +
                "Configure the server URL in Settings.")
            return chain.proceed(originalRequest)
        }

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
