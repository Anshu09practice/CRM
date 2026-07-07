package com.jalanjyothi.crm.ui.screens.stock

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.jalanjyothi.crm.data.remote.PurchaseDto
import com.jalanjyothi.crm.data.repository.OfflineRepository
import com.jalanjyothi.crm.data.repository.toPurchaseDto
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.FlowPreview
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.debounce
import kotlinx.coroutines.flow.flatMapLatest
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

@OptIn(FlowPreview::class, ExperimentalCoroutinesApi::class)
@HiltViewModel
class PurchasesViewModel @Inject constructor(
    private val repository: OfflineRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(PurchasesUiState())
    val uiState: StateFlow<PurchasesUiState> = _uiState.asStateFlow()

    private val _searchQuery = MutableStateFlow("")

    init {
        // Observe Room — updates reactively when purchases are added/deleted
        viewModelScope.launch {
            _searchQuery
                .debounce(300)
                .flatMapLatest { query ->
                    if (query.isBlank()) repository.observePurchases()
                    else repository.searchPurchases(query)
                }
                .collect { entities ->
                    val purchases = entities.map { it.toPurchaseDto() }
                    _uiState.update {
                        it.copy(
                            purchases = purchases,
                            totalCost = purchases.fold(0.0) { acc, p -> acc + p.totalCost },
                            isLoading = false,
                        )
                    }
                }
        }
        // Background sync from server on startup
        syncPurchases()
    }

    fun onSearchChange(query: String) {
        _searchQuery.value = query
        _uiState.update { it.copy(searchQuery = query) }
    }

    fun syncPurchases() {
        viewModelScope.launch {
            repository.syncPurchases()
        }
    }

    fun deletePurchase(id: Int) {
        viewModelScope.launch {
            try {
                repository.deletePurchaseLocal(id)
            } catch (e: Exception) {
                _uiState.update { it.copy(error = "Failed to delete purchase") }
            }
        }
    }
}

