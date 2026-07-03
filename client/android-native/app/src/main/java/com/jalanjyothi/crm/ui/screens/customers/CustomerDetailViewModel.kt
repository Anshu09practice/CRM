package com.jalanjyothi.crm.ui.screens.customers

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.jalanjyothi.crm.data.remote.ApiService
import com.jalanjyothi.crm.data.remote.CustomerDto
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class CustomerDetailUiState(
    val customer: CustomerDto? = null,
    val isLoading: Boolean = true,
    val error: String? = null,
)

@HiltViewModel
class CustomerDetailViewModel @Inject constructor(
    private val api: ApiService,
    savedStateHandle: SavedStateHandle,
) : ViewModel() {

    private val customerId: Int = savedStateHandle.get<Int>("customerId") ?: 0

    private val _uiState = MutableStateFlow(CustomerDetailUiState())
    val uiState: StateFlow<CustomerDetailUiState> = _uiState.asStateFlow()

    init {
        loadCustomer()
    }

    private fun loadCustomer() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }
            try {
                val customer = api.getCustomer(customerId)
                _uiState.update { it.copy(customer = customer, isLoading = false) }
            } catch (e: Exception) {
                _uiState.update { it.copy(isLoading = false, error = "Failed to load customer") }
            }
        }
    }
}
