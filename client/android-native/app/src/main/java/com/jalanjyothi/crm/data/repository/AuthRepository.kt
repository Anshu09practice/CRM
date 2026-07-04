package com.jalanjyothi.crm.data.repository

import com.jalanjyothi.crm.AppLogger
import com.jalanjyothi.crm.data.local.AuthTokenStore
import com.jalanjyothi.crm.data.local.LocalAuthHelper
import com.jalanjyothi.crm.data.local.dao.UserDao
import com.jalanjyothi.crm.data.local.entity.UserEntity
import com.jalanjyothi.crm.data.remote.ApiService
import com.jalanjyothi.crm.data.remote.LoginRequest
import com.jalanjyothi.crm.data.remote.LoginResponse
import com.jalanjyothi.crm.data.remote.RefreshRequest
import com.jalanjyothi.crm.data.remote.UserDto
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.withContext
import java.io.IOException
import java.time.Instant
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AuthRepository @Inject constructor(
    private val api: ApiService,
    private val tokenStore: AuthTokenStore,
    private val userDao: UserDao,
) {
    val isLoggedIn: Flow<Boolean> = tokenStore.isLoggedIn
    val username: Flow<String?> = tokenStore.username
    val role: Flow<String?> = tokenStore.role

    /**
     * Seeds a default admin/admin user the very first time the app is installed,
     * so the app can be used offline without ever connecting to a server.
     */
    suspend fun seedDefaultAdminIfNeeded() = withContext(Dispatchers.IO) {
        if (userDao.count() == 0) {
            AppLogger.i("Auth", "First install: seeding default admin user")
            val hash = LocalAuthHelper.hashPassword("admin")
            userDao.upsert(
                UserEntity(
                    username = "admin",
                    passwordHash = hash,
                    role = "owner",
                    isActive = true,
                    createdAt = Instant.now().toString(),
                )
            )
            AppLogger.i("Auth", "Default admin seeded")
        } else {
            AppLogger.d("Auth", "Local users exist — skipping seed")
        }
    }

    suspend fun checkSetupRequired(): Boolean {
        return try {
            api.getStatus().setupRequired
        } catch (_: Exception) {
            // Server unreachable — treat as no setup required (local user already seeded)
            false
        }
    }

    /**
     * Attempts server login first. On network failure falls back to locally-cached
     * credentials so the app works without a server connection.
     * On a successful server login the credentials are cached locally for future offline use.
     */
    suspend fun login(username: String, password: String?): Result<LoginResponse> {
        val serverUrl = tokenStore.serverUrl.first()
        AppLogger.i("Auth", "login() user='$username' serverUrl='${serverUrl.ifBlank { "<empty>" }}'")
        // No server URL configured — skip the network and use local auth directly
        if (serverUrl.isBlank() && password != null) {
            AppLogger.i("Auth", "No server URL — falling back to local auth")
            return loginLocally(username, password)
        }

        return try {
            val response = api.login(LoginRequest(username, password))
            if (response.token != null && response.refreshToken != null && response.user != null) {
                AppLogger.i("Auth", "Server login OK — user='${response.user.username}' role='${response.user.role}'")
                tokenStore.saveTokens(response.token, response.refreshToken)
                tokenStore.saveUser(response.user.username, response.user.role)
                // Cache credentials locally for future offline logins
                if (password != null) {
                    cacheUserLocally(response.user.username, password, response.user.role)
                }
            } else {
                AppLogger.i("Auth", "Server login partial response: token=${response.token != null} otpSent=${response.otpSent}")
            }
            Result.success(response)
        } catch (e: Exception) {
            AppLogger.w("Auth", "Server login failed: ${e.javaClass.simpleName}: ${e.message}")
            // Fall back to local auth only for genuine network errors (not 401/423)
            if (password != null && isNetworkError(e)) {
                AppLogger.i("Auth", "Network error — trying local auth fallback")
                loginLocally(username, password)
            } else {
                Result.failure(e)
            }
        }
    }

    suspend fun verifyToken(): Boolean {
        val token = tokenStore.getAccessToken()
        if (token == null) {
            AppLogger.i("Auth", "verifyToken(): no token stored — not logged in")
            return false
        }
        // Local session — verify the cached user still exists and is active
        if (token.startsWith("local-")) {
            AppLogger.d("Auth", "verifyToken(): local session token found")
            val uname = tokenStore.username.first() ?: return false
            return withContext(Dispatchers.IO) {
                val user = userDao.getByUsername(uname)
                val valid = user != null && user.isActive
                AppLogger.i("Auth", "verifyToken(): local user='$uname' valid=$valid")
                valid
            }
        }
        AppLogger.d("Auth", "verifyToken(): calling server verify endpoint")
        return try {
            val valid = api.verifyToken().valid
            AppLogger.i("Auth", "verifyToken(): server says valid=$valid")
            valid
        } catch (e: Exception) {
            AppLogger.w("Auth", "verifyToken(): server error (${e.javaClass.simpleName}: ${e.message}) — trying token refresh")
            refreshToken()
        }
    }

    private suspend fun refreshToken(): Boolean {
        val refresh = tokenStore.getRefreshToken()
        if (refresh == null) {
            AppLogger.w("Auth", "refreshToken(): no refresh token stored — clearing session")
            tokenStore.clear()
            return false
        }
        // Re-validate local session without hitting the network
        if (refresh == "local-refresh") {
            AppLogger.d("Auth", "refreshToken(): local session refresh")
            val uname = tokenStore.username.first() ?: return false
            return withContext(Dispatchers.IO) {
                val user = userDao.getByUsername(uname) ?: run {
                    AppLogger.w("Auth", "refreshToken(): local user '$uname' not found — clearing session")
                    tokenStore.clear(); return@withContext false
                }
                if (!user.isActive) {
                    AppLogger.w("Auth", "refreshToken(): local user '$uname' is inactive — clearing session")
                    tokenStore.clear(); return@withContext false
                }
                tokenStore.saveTokens("local-${System.currentTimeMillis()}", "local-refresh")
                AppLogger.i("Auth", "refreshToken(): local session re-validated for '$uname'")
                true
            }
        }
        return try {
            AppLogger.d("Auth", "refreshToken(): calling server refresh endpoint")
            val response = api.refreshToken(RefreshRequest(refresh))
            tokenStore.saveTokens(response.token, response.refreshToken)
            AppLogger.i("Auth", "refreshToken(): server refresh OK")
            true
        } catch (e: Exception) {
            AppLogger.w("Auth", "refreshToken(): server refresh failed (${e.message}) — clearing session")
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

    // ─── Private helpers ─────────────────────────────────────────────────────

    private suspend fun loginLocally(username: String, password: String): Result<LoginResponse> =
        withContext(Dispatchers.IO) {
            val user = userDao.getByUsername(username)
                ?: return@withContext Result.failure(Exception("Invalid credentials"))
            if (!user.isActive)
                return@withContext Result.failure(Exception("Account is disabled"))
            if (!LocalAuthHelper.verifyPassword(password, user.passwordHash))
                return@withContext Result.failure(Exception("Invalid credentials"))

            userDao.updateLastLogin(username, Instant.now().toString())
            val localToken = "local-${System.currentTimeMillis()}"
            tokenStore.saveTokens(localToken, "local-refresh")
            tokenStore.saveUser(user.username, user.role)
            Result.success(
                LoginResponse(
                    token = localToken,
                    refreshToken = "local-refresh",
                    user = UserDto(id = user.id, username = user.username, role = user.role),
                )
            )
        }

    private suspend fun cacheUserLocally(username: String, password: String, role: String) =
        withContext(Dispatchers.IO) {
            val hash = LocalAuthHelper.hashPassword(password)
            val now = Instant.now().toString()
            val existing = userDao.getByUsername(username)
            userDao.upsert(
                UserEntity(
                    id = existing?.id ?: 0,
                    username = username,
                    passwordHash = hash,
                    role = role,
                    isActive = true,
                    lastLogin = now,
                    createdAt = existing?.createdAt ?: now,
                )
            )
        }

    /** Returns true for genuine connectivity failures (not HTTP 4xx/5xx). */
    private fun isNetworkError(e: Exception): Boolean =
        e is IOException ||
        e.message?.contains("timeout", ignoreCase = true) == true ||
        e.message?.contains("Unable to resolve host", ignoreCase = true) == true
}

