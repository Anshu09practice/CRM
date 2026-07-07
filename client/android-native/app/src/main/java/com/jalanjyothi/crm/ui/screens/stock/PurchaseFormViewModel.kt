package com.jalanjyothi.crm.ui.screens.stock

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.jalanjyothi.crm.data.remote.CreatePurchaseRequest
import com.jalanjyothi.crm.data.remote.ItemDto
import com.jalanjyothi.crm.data.repository.OfflineRepository
import com.jalanjyothi.crm.data.repository.toItemDto
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.time.LocalDate
import javax.inject.Inject

data class PurchaseFormUiState(
    val items: List<ItemDto> = emptyList(),
    val filteredItems: List<ItemDto> = emptyList(),
    val isLoading: Boolean = true,
    val isSaving: Boolean = false,
    val selectedItem: ItemDto? = null,
    val itemQuery: String = "",
    val isDropdownExpanded: Boolean = false,
    val quantity: String = "",
    val purchaseCost: String = "",
    val purchaseDate: String = LocalDate.now().toString(),
    val notes: String = "",
    val error: String? = null,
    val itemError: String? = null,
    val quantityError: String? = null,
)

@HiltViewModel
class PurchaseFormViewModel @Inject constructor(
    private val repository: OfflineRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(PurchaseFormUiState())
    val uiState: StateFlow<PurchaseFormUiState> = _uiState.asStateFlow()

    init {
        loadItems()
    }

    private fun loadItems() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }
            try {
                val items = repository.observeItems().first().map { it.toItemDto() }
                _uiState.update { it.copy(items = items, filteredItems = items, isLoading = false) }
            } catch (e: Exception) {
                _uiState.update { it.copy(isLoading = false, error = "Failed to load items") }
            }
        }
    }

    fun onItemQueryChange(query: String) {
        val filtered = if (query.isBlank()) {
            _uiState.value.items
        } else {
            _uiState.value.items.filter { it.itemName.contains(query, ignoreCase = true) }
        }
        _uiState.update {
            it.copy(
                itemQuery = query,
                filteredItems = filtered,
                isDropdownExpanded = query.isNotBlank(),
                itemError = null,
            )
        }
    }

    fun onItemSelect(item: ItemDto) {
        _uiState.update {
            it.copy(
                selectedItem = item,
                itemQuery = item.itemName,
                purchaseCost = item.purchaseCost.toString(),
                isDropdownExpanded = false,
                itemError = null,
            )
        }
    }

    fun onDropdownDismiss() {
        _uiState.update { it.copy(isDropdownExpanded = false) }
    }

    fun onQuantityChange(value: String) {
        _uiState.update { it.copy(quantity = value, quantityError = null) }
    }

    fun onPurchaseCostChange(value: String) {
        _uiState.update { it.copy(purchaseCost = value) }
    }

    fun onDateChange(value: String) {
        _uiState.update { it.copy(purchaseDate = value) }
    }

    fun onNotesChange(value: String) {
        _uiState.update { it.copy(notes = value) }
    }

    fun save(onSuccess: () -> Unit) {
        val state = _uiState.value

        if (state.selectedItem == null) {
            _uiState.update { it.copy(itemError = "Please select an item") }
            return
        }
        val qty = state.quantity.toIntOrNull()
        if (qty == null || qty <= 0) {
            _uiState.update { it.copy(quantityError = "Quantity must be greater than 0") }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isSaving = true, error = null) }
            try {
                repository.createPurchaseLocal(
                    CreatePurchaseRequest(
                        itemId = state.selectedItem.id,
                        quantity = qty,
                        purchaseCost = state.purchaseCost.toDoubleOrNull(),
                        purchaseDate = state.purchaseDate.ifBlank { null },
                        notes = state.notes.ifBlank { null },
                    )
                )
                _uiState.update { it.copy(isSaving = false) }
                onSuccess()
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(isSaving = false, error = "Failed to record purchase: ${e.message}")
                }
            }
        }
    }
}
