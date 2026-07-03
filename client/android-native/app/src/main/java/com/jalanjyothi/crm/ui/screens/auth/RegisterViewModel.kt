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

data class RegisterUiState(
    val username: String = "",
    val password: String = "",
    val securityQuestion: String = "",
    val securityAnswer: String = "",
    val isLoading: Boolean = false,
    val error: String? = null,
)

@HiltViewModel
class RegisterViewModel @Inject constructor(
    private val authRepository: AuthRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(RegisterUiState())
    val uiState: StateFlow<RegisterUiState> = _uiState.asStateFlow()

    fun onUsernameChange(value: String) {
        _uiState.update { it.copy(username = value, error = null) }
    }

    fun onPasswordChange(value: String) {
        _uiState.update { it.copy(password = value, error = null) }
    }

    fun onSecurityQuestionChange(value: String) {
        _uiState.update { it.copy(securityQuestion = value, error = null) }
    }

    fun onSecurityAnswerChange(value: String) {
        _uiState.update { it.copy(securityAnswer = value, error = null) }
    }

    fun onRegister(onSuccess: () -> Unit) {
        val state = _uiState.value

        if (state.username.isBlank()) {
            _uiState.update { it.copy(error = "Username is required") }
            return
        }
        if (state.password.isBlank()) {
            _uiState.update { it.copy(error = "Password is required") }
            return
        }
        if (state.password.length < 4) {
            _uiState.update { it.copy(error = "Password must be at least 4 characters") }
            return
        }
        if (state.securityQuestion.isBlank()) {
            _uiState.update { it.copy(error = "Security question is required") }
            return
        }
        if (state.securityAnswer.isBlank()) {
            _uiState.update { it.copy(error = "Security answer is required") }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }

            val result = authRepository.register(
                username = state.username.trim(),
                password = state.password,
                securityQuestion = state.securityQuestion.trim(),
                securityAnswer = state.securityAnswer.trim(),
            )

            result.fold(
                onSuccess = {
                    _uiState.update { it.copy(isLoading = false) }
                    onSuccess()
                },
                onFailure = { e ->
                    val message = when {
                        e.message?.contains("409") == true -> "Username already exists"
                        e.message?.contains("reserved") == true -> "This username is reserved"
                        else -> e.message ?: "Registration failed"
                    }
                    _uiState.update { it.copy(isLoading = false, error = message) }
                },
            )
        }
    }
}
