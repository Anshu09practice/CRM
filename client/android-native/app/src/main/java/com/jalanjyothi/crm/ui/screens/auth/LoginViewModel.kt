package com.jalanjyothi.crm.ui.screens.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.jalanjyothi.crm.data.repository.AuthRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class LoginUiState(
    val username: String = "",
    val password: String = "",
    val isLoading: Boolean = false,
    val error: String? = null,
    val showPasswordField: Boolean = false,
    val otpSent: Boolean = false,
    val waUrl: String? = null,
)

@HiltViewModel
class LoginViewModel @Inject constructor(
    private val authRepository: AuthRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(LoginUiState())
    val uiState: StateFlow<LoginUiState> = _uiState.asStateFlow()

    fun onUsernameChange(value: String) {
        _uiState.update { it.copy(username = value, error = null) }
    }

    fun onPasswordChange(value: String) {
        _uiState.update { it.copy(password = value, error = null) }
    }

    fun onContinue(onSuccess: () -> Unit) {
        val state = _uiState.value
        if (state.username.isBlank()) {
            _uiState.update { it.copy(error = "Enter your username") }
            return
        }

        if (!state.showPasswordField) {
            // First step: show password field
            _uiState.update { it.copy(showPasswordField = true, error = null) }
            return
        }

        // Second step: attempt login
        login(onSuccess)
    }

    private fun login(onSuccess: () -> Unit) {
        val state = _uiState.value
        if (state.password.isBlank() && !state.otpSent) {
            _uiState.update { it.copy(error = "Enter your password") }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }

            val result = authRepository.login(
                username = state.username.trim(),
                password = state.password.ifBlank { null },
            )

            result.fold(
                onSuccess = { response ->
                    if (response.otpSent == true) {
                        _uiState.update {
                            it.copy(
                                isLoading = false,
                                otpSent = true,
                                waUrl = response.waUrl,
                                password = "",
                                error = null,
                            )
                        }
                    } else if (response.token != null) {
                        _uiState.update { it.copy(isLoading = false) }
                        onSuccess()
                    } else {
                        _uiState.update {
                            it.copy(isLoading = false, error = "Login failed. Try again.")
                        }
                    }
                },
                onFailure = { e ->
                    val message = when {
                        e.message?.contains("401") == true -> "Invalid credentials"
                        e.message?.contains("423") == true -> "Account locked. Try again later."
                        e.message?.contains("timeout", true) == true -> "Server unreachable. Check server is running."
                        e.message?.contains("refused", true) == true -> "Connection refused. Firewall may be blocking port 3001."
                        e.message?.contains("Unable to resolve host", true) == true -> "Cannot reach server. Check IP: ${state.username.let { "10.22.184.254:3001" }}"
                        e.message?.contains("CLEARTEXT", true) == true -> "Cleartext not permitted. Use HTTPS URL."
                        e.message?.contains("certificate", true) == true || e.message?.contains("SSL", true) == true -> "SSL error: ${e.message}"
                        else -> "Error: ${e.javaClass.simpleName}: ${e.message}"
                    }
                    _uiState.update { it.copy(isLoading = false, error = message) }
                },
            )
        }
    }

    fun onBackToUsername() {
        _uiState.update {
            it.copy(showPasswordField = false, password = "", error = null, otpSent = false)
        }
    }
}
