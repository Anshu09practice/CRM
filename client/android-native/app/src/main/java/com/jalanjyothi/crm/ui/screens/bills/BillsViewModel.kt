package com.jalanjyothi.crm.ui.screens.bills

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.jalanjyothi.crm.data.remote.ApiService
import com.jalanjyothi.crm.data.remote.BillDto
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class BillsUiState(
    val bills: List<BillDto> = emptyList(),
    val isLoading: Boolean = true,
    val searchQuery: String = "",
    val selectedFilter: String? = null,
    val error: String? = null,
)

@HiltViewModel
class BillsViewModel @Inject constructor(
    private val api: ApiService,
) : ViewModel() {

    private val _uiState = MutableStateFlow(BillsUiState())
    val uiState: StateFlow<BillsUiState> = _uiState.asStateFlow()

    private var searchJob: Job? = null

    init {
        loadBills()
    }

    fun onSearchChange(query: String) {
        _uiState.update { it.copy(searchQuery = query) }
        searchJob?.cancel()
        searchJob = viewModelScope.launch {
            delay(300) // Debounce
            loadBills()
        }
    }

    fun onFilterChange(filter: String?) {
        _uiState.update { it.copy(selectedFilter = filter) }
        loadBills()
    }

    private fun loadBills() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }
            try {
                val response = api.getBills(
                    search = _uiState.value.searchQuery.ifBlank { null },
                    paymentStatus = _uiState.value.selectedFilter,
                )
                _uiState.update { it.copy(bills = response.bills, isLoading = false) }
            } catch (e: Exception) {
                _uiState.update { it.copy(isLoading = false, error = "Couldn't load bills") }
            }
        }
    }

    fun refresh() = loadBills()
}
