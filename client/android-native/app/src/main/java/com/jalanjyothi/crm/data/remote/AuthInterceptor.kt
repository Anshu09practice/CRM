package com.jalanjyothi.crm.data.remote

import com.jalanjyothi.crm.data.local.AuthTokenStore
import kotlinx.coroutines.runBlocking
import okhttp3.Interceptor
import okhttp3.Response
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AuthInterceptor @Inject constructor(
    private val tokenStore: AuthTokenStore,
) : Interceptor {

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

        val token = runBlocking { tokenStore.getAccessToken() }

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
