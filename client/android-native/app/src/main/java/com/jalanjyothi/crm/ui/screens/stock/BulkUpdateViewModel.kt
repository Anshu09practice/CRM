package com.jalanjyothi.crm.ui.screens.stock

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.jalanjyothi.crm.data.repository.OfflineRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class BulkItemState(
    val id: Int,
    val skuId: String?,
    val itemName: String,
    val packagingStyle: String?,
    val packageQuantityGrams: Double,
    val purchaseCost: String,
    val sellingPrice: String,
    val mrp: String,
    val categoryName: String?,
    val isModified: Boolean = false,
)

data class BulkUpdateUiState(
    val allItems: List<BulkItemState> = emptyList(),
    val filteredItems: List<BulkItemState> = emptyList(),
    val isLoading: Boolean = true,
    val isSaving: Boolean = false,
    val searchQuery: String = "",
    val error: String? = null,
    val successMessage: String? = null,
)

@HiltViewModel
class BulkUpdateViewModel @Inject constructor(
    private val repository: OfflineRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(BulkUpdateUiState())
    val uiState: StateFlow<BulkUpdateUiState> = _uiState.asStateFlow()

    init {
        loadItems()
    }

    private fun loadItems() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }
            try {
                val entities = repository.observeItems().first()
                val bulkItems = entities.map { item ->
                    BulkItemState(
                        id = item.id,
                        skuId = item.skuId,
                        itemName = item.itemName,
                        packagingStyle = item.packagingStyle,
                        packageQuantityGrams = item.packageQuantityGrams,
                        purchaseCost = item.purchaseCost.toString(),
                        sellingPrice = item.sellingPrice.toString(),
                        mrp = item.mrp?.toString() ?: "",
                        categoryName = item.categoryName,
                    )
                }
                _uiState.update {
                    it.copy(allItems = bulkItems, filteredItems = bulkItems, isLoading = false)
                }
            } catch (e: Exception) {
                _uiState.update { it.copy(isLoading = false, error = "Failed to load items") }
            }
        }
    }

    fun onSearchChange(query: String) {
        val filtered = if (query.isBlank()) {
            _uiState.value.allItems
        } else {
            _uiState.value.allItems.filter { it.itemName.contains(query, ignoreCase = true) }
        }
        _uiState.update { it.copy(searchQuery = query, filteredItems = filtered) }
    }

    fun onPurchaseCostChange(id: Int, value: String) {
        updateItem(id) { it.copy(purchaseCost = value, isModified = true) }
    }

    fun onSellingPriceChange(id: Int, value: String) {
        updateItem(id) { it.copy(sellingPrice = value, isModified = true) }
    }

    fun onMrpChange(id: Int, value: String) {
        updateItem(id) { it.copy(mrp = value, isModified = true) }
    }

    private fun updateItem(id: Int, transform: (BulkItemState) -> BulkItemState) {
        _uiState.update { state ->
            val updatedAll = state.allItems.map { if (it.id == id) transform(it) else it }
            val updatedFiltered = state.filteredItems.map { if (it.id == id) transform(it) else it }
            state.copy(allItems = updatedAll, filteredItems = updatedFiltered)
        }
    }

    fun modifiedCount(): Int = _uiState.value.allItems.count { it.isModified }

    fun saveChanges(onSuccess: () -> Unit) {
        val modifiedItems = _uiState.value.allItems.filter { it.isModified }
        if (modifiedItems.isEmpty()) {
            onSuccess()
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isSaving = true, error = null, successMessage = null) }
            try {
                for (item in modifiedItems) {
                    repository.updateItemPricingLocal(
                        id = item.id,
                        purchaseCost = item.purchaseCost.toDoubleOrNull() ?: 0.0,
                        sellingPrice = item.sellingPrice.toDoubleOrNull() ?: 0.0,
                        mrp = item.mrp.toDoubleOrNull(),
                    )
                }
                _uiState.update {
                    it.copy(isSaving = false, successMessage = "Updated ${modifiedItems.size} item(s)")
                }
                onSuccess()
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(isSaving = false, error = "Bulk update failed: ${e.message}")
                }
            }
        }
    }
}
