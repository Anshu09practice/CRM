package com.jalanjyothi.crm.ui.screens.settings

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.jalanjyothi.crm.data.local.AuthTokenStore
import com.jalanjyothi.crm.data.remote.ApiService
import com.jalanjyothi.crm.data.remote.CategoryDto
import com.jalanjyothi.crm.data.remote.ServerUrlInterceptor
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class UserItem(
    val id: Int,
    val username: String,
    val role: String,
    val isActive: Boolean,
)

data class SettingsUiState(
    val users: List<UserItem> = emptyList(),
    val categories: List<CategoryDto> = emptyList(),
    val isLoading: Boolean = true,
    val serverUrl: String = "",
    val serverUrlSaved: Boolean = false,
    val connectionTestResult: String? = null,
    val isTestingConnection: Boolean = false,
)

@HiltViewModel
class SettingsViewModel @Inject constructor(
    private val api: ApiService,
    private val tokenStore: AuthTokenStore,
) : ViewModel() {

    private val _uiState = MutableStateFlow(SettingsUiState())
    val uiState: StateFlow<SettingsUiState> = _uiState.asStateFlow()

    init {
        loadData()
        loadServerUrl()
    }

    private fun loadData() {
        viewModelScope.launch {
            try {
                val categories = api.getCategories()
                _uiState.update { it.copy(categories = categories, isLoading = false) }
            } catch (_: Exception) {
                _uiState.update { it.copy(isLoading = false) }
            }
        }
    }

    private fun loadServerUrl() {
        viewModelScope.launch {
            val url = tokenStore.serverUrl.first()
            _uiState.update { it.copy(serverUrl = url) }
        }
    }

    fun onServerUrlChange(url: String) {
        _uiState.update { it.copy(serverUrl = url, serverUrlSaved = false, connectionTestResult = null) }
    }

    fun saveServerUrl() {
        val url = _uiState.value.serverUrl.trim().trimEnd('/')
        if (url.isBlank()) return
        viewModelScope.launch {
            tokenStore.saveServerUrl(url)
            _uiState.update { it.copy(serverUrl = url, serverUrlSaved = true) }
        }
    }

    fun testConnection() {
        _uiState.update { it.copy(isTestingConnection = true, connectionTestResult = null) }
        viewModelScope.launch {
            try {
                api.getStatus()
                _uiState.update { it.copy(connectionTestResult = "Connected successfully", isTestingConnection = false) }
            } catch (e: Exception) {
                val msg = when {
                    e.message?.contains("ECONNREFUSED") == true -> "Connection refused — is the server running?"
                    e.message?.contains("timeout") == true -> "Connection timed out"
                    e.message?.contains("Unable to resolve host") == true -> "Cannot reach server — check IP and WiFi"
                    else -> "Failed: ${e.javaClass.simpleName}"
                }
                _uiState.update { it.copy(connectionTestResult = msg, isTestingConnection = false) }
            }
        }
    }

    fun dismissConnectionResult() {
        _uiState.update { it.copy(connectionTestResult = null, serverUrlSaved = false) }
    }

    fun setEmulatorUrl() {
        _uiState.update { it.copy(serverUrl = ServerUrlInterceptor.EMULATOR_URL, serverUrlSaved = false) }
    }

    fun setDeviceUrl() {
        _uiState.update { it.copy(serverUrl = ServerUrlInterceptor.DEVICE_URL, serverUrlSaved = false) }
    }

    fun deleteCategory(id: Int) {
        viewModelScope.launch {
            try {
                api.deleteCategory(id)
                _uiState.update { state ->
                    state.copy(categories = state.categories.filter { it.id != id })
                }
            } catch (_: Exception) { }
        }
    }
}

