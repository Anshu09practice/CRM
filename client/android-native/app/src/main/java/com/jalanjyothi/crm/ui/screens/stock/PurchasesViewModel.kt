package com.jalanjyothi.crm.ui.screens.stock

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.jalanjyothi.crm.data.remote.ApiService
import com.jalanjyothi.crm.data.remote.PurchaseDto
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class PurchasesUiState(
    val purchases: List<PurchaseDto> = emptyList(),
    val totalCost: Double = 0.0,
    val isLoading: Boolean = true,
    val searchQuery: String = "",
    val error: String? = null,
)

@HiltViewModel
class PurchasesViewModel @Inject constructor(
    private val api: ApiService,
) : ViewModel() {

    private val _uiState = MutableStateFlow(PurchasesUiState())
    val uiState: StateFlow<PurchasesUiState> = _uiState.asStateFlow()

    private var searchJob: Job? = null

    init {
        loadPurchases()
    }

    fun onSearchChange(query: String) {
        _uiState.update { it.copy(searchQuery = query) }
        searchJob?.cancel()
        searchJob = viewModelScope.launch {
            delay(300)
            loadPurchases()
        }
    }

    private fun loadPurchases() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }
            try {
                val response = api.getPurchases(
                    search = _uiState.value.searchQuery.ifBlank { null },
                )
                _uiState.update {
                    it.copy(
                        purchases = response.purchases,
                        totalCost = response.totalCost,
                        isLoading = false,
                    )
                }
            } catch (e: Exception) {
                _uiState.update { it.copy(isLoading = false, error = "Couldn't load purchases") }
            }
        }
    }
}
