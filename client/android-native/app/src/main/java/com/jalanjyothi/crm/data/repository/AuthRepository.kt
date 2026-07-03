package com.jalanjyothi.crm.data.repository

import com.jalanjyothi.crm.data.local.AuthTokenStore
import com.jalanjyothi.crm.data.remote.ApiService
import com.jalanjyothi.crm.data.remote.LoginRequest
import com.jalanjyothi.crm.data.remote.LoginResponse
import com.jalanjyothi.crm.data.remote.RefreshRequest
import kotlinx.coroutines.flow.Flow
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AuthRepository @Inject constructor(
    private val api: ApiService,
    private val tokenStore: AuthTokenStore,
) {
    val isLoggedIn: Flow<Boolean> = tokenStore.isLoggedIn
    val username: Flow<String?> = tokenStore.username
    val role: Flow<String?> = tokenStore.role

    suspend fun checkSetupRequired(): Boolean {
        return try {
            api.getStatus().setupRequired
        } catch (e: Exception) {
            false
        }
    }

    suspend fun login(username: String, password: String?): Result<LoginResponse> {
        return try {
            val response = api.login(LoginRequest(username, password))
            if (response.token != null && response.refreshToken != null && response.user != null) {
                tokenStore.saveTokens(response.token, response.refreshToken)
                tokenStore.saveUser(response.user.username, response.user.role)
            }
            Result.success(response)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun verifyToken(): Boolean {
        return try {
            tokenStore.getAccessToken() ?: return false
            api.verifyToken().valid
        } catch (e: Exception) {
            // Try refresh
            refreshToken()
        }
    }

    private suspend fun refreshToken(): Boolean {
        return try {
            val refresh = tokenStore.getRefreshToken() ?: return false
            val response = api.refreshToken(RefreshRequest(refresh))
            tokenStore.saveTokens(response.token, response.refreshToken)
            true
        } catch (e: Exception) {
            tokenStore.clear()
            false
        }
    }

    suspend fun register(
        username: String,
        password: String,
        securityQuestion: String,
        securityAnswer: String,
    ): Result<Unit> {
        return try {
            api.register(
                com.jalanjyothi.crm.data.remote.RegisterRequest(
                    username = username,
                    password = password,
                    securityQuestion = securityQuestion,
                    securityAnswer = securityAnswer,
                )
            )
            Result.success(Unit)
        } catch (e: retrofit2.HttpException) {
            val msg = when (e.code()) {
                409 -> "Username already exists"
                400 -> "Invalid input"
                else -> "Registration failed"
            }
            Result.failure(Exception(msg))
        } catch (e: ClassCastException) {
            // R8/ProGuard can strip generic type info from Continuation parameters,
            // causing Retrofit to throw ClassCastException instead of resolving the
            // suspend function's response type. Rebuild the release APK after updating
            // proguard-rules.pro to permanently fix this.
            Result.failure(Exception("Registration failed. Please try again."))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun logout() {
        try {
            api.logout()
        } catch (_: Exception) {
            // Best-effort server logout
        }
        tokenStore.clear()
    }
}
