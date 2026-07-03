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

@HiltViewModel
class AuthViewModel @Inject constructor(
    private val authRepository: AuthRepository,
) : ViewModel() {

    private val _authState = MutableStateFlow(AuthState())
    val authState: StateFlow<AuthState> = _authState.asStateFlow()

    init {
        checkAuth()
        collectRole()
    }

    private fun checkAuth() {
        viewModelScope.launch {
            val isValid = authRepository.verifyToken()
            _authState.update {
                it.copy(isAuthenticated = isValid, isLoading = false)
            }
        }
    }

    private fun collectRole() {
        viewModelScope.launch {
            authRepository.role.collect { role ->
                _authState.update { it.copy(role = role) }
            }
        }
    }

    fun onLoginSuccess() {
        viewModelScope.launch {
            authRepository.role.collect { role ->
                _authState.update { it.copy(isAuthenticated = true, role = role) }
            }
        }
    }

    fun logout() {
        viewModelScope.launch {
            authRepository.logout()
            _authState.update { AuthState(isAuthenticated = false, isLoading = false, role = null) }
        }
    }
}
