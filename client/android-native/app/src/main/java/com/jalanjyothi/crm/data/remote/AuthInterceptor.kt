package com.jalanjyothi.crm.data.remote

import com.jalanjyothi.crm.AppLogger
import com.jalanjyothi.crm.data.local.AuthTokenStore
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import okhttp3.Interceptor
import okhttp3.Response
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AuthInterceptor @Inject constructor(
    private val tokenStore: AuthTokenStore,
) : Interceptor {

    // Cache the token so interceptor never blocks the OkHttp thread with runBlocking.
    // The coroutine collector keeps this in sync whenever the token changes in DataStore.
    @Volatile private var cachedToken: String? = null

    init {
        CoroutineScope(SupervisorJob() + Dispatchers.IO).launch {
            tokenStore.accessToken.collect { token ->
                val state = when {
                    token == null -> "null (logged out)"
                    token.startsWith("local-") -> "local session token"
                    else -> "server JWT (${token.take(12)}…)"
                }
                AppLogger.d("Auth", "Cached token updated: $state")
                cachedToken = token
            }
        }
    }

    override fun intercept(chain: Interceptor.Chain): Response {
        val request = chain.request()

        // Skip auth header for public endpoints
        val path = request.url.encodedPath
        if (path.contains("/auth/login") ||
            path.contains("/auth/status") ||
            path.contains("/auth/setup") ||
            path.contains("/auth/register") ||
            path.contains("/auth/refresh") ||
            path.contains("/auth/forgot-password")
        ) {
            return chain.proceed(request)
        }

        val token = cachedToken

        val authenticatedRequest = if (token != null) {
            request.newBuilder()
                .header("Authorization", "Bearer $token")
                .build()
        } else {
            request
        }

        return chain.proceed(authenticatedRequest)
    }
}
