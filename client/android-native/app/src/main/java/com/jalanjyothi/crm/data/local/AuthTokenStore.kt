package com.jalanjyothi.crm.data.local

import android.content.Context
import android.os.Build
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

private val Context.authDataStore: DataStore<Preferences> by preferencesDataStore(name = "auth_prefs")

@Singleton
class AuthTokenStore @Inject constructor(
    @ApplicationContext private val context: Context,
) {
    private val accessTokenKey = stringPreferencesKey("access_token")
    private val refreshTokenKey = stringPreferencesKey("refresh_token")
    private val usernameKey = stringPreferencesKey("username")
    private val roleKey = stringPreferencesKey("role")
    private val serverUrlKey = stringPreferencesKey("server_url")

    val isLoggedIn: Flow<Boolean> = context.authDataStore.data.map { prefs ->
        prefs[accessTokenKey] != null
    }

    val accessToken: Flow<String?> = context.authDataStore.data.map { prefs ->
        prefs[accessTokenKey]
    }

    val username: Flow<String?> = context.authDataStore.data.map { prefs ->
        prefs[usernameKey]
    }

    val role: Flow<String?> = context.authDataStore.data.map { prefs ->
        prefs[roleKey]
    }

    val serverUrl: Flow<String> = context.authDataStore.data.map { prefs ->
        prefs[serverUrlKey] ?: getDefaultServerUrl()
    }

    private fun getDefaultServerUrl(): String {
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
        return if (isEmulator) "https://10.0.2.2:3001" else ""
    }

    suspend fun getAccessToken(): String? {
        return context.authDataStore.data.first()[accessTokenKey]
    }

    suspend fun getRefreshToken(): String? {
        return context.authDataStore.data.first()[refreshTokenKey]
    }

    suspend fun saveTokens(accessToken: String, refreshToken: String) {
        context.authDataStore.edit { prefs ->
            prefs[accessTokenKey] = accessToken
            prefs[refreshTokenKey] = refreshToken
        }
    }

    suspend fun saveUser(username: String, role: String) {
        context.authDataStore.edit { prefs ->
            prefs[usernameKey] = username
            prefs[roleKey] = role
        }
    }

    suspend fun saveServerUrl(url: String) {
        context.authDataStore.edit { prefs ->
            prefs[serverUrlKey] = url
        }
    }

    suspend fun clear() {
        context.authDataStore.edit { it.clear() }
    }

    companion object {
        const val DEFAULT_SERVER_URL = ""
    }
}
