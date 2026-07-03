package com.jalanjyothi.crm.ui.screens.auth

import com.jalanjyothi.crm.data.remote.UserDto

data class AuthState(
    val isAuthenticated: Boolean = false,
    val isLoading: Boolean = true,
    val user: UserDto? = null,
    val role: String? = null,
)
