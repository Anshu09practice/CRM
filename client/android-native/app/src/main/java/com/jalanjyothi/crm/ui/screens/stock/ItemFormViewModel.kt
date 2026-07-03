package com.jalanjyothi.crm.ui.screens.stock

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.jalanjyothi.crm.data.remote.ApiService
import com.jalanjyothi.crm.data.remote.CategoryDto
import com.jalanjyothi.crm.data.remote.CreateItemRequest
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class ItemFormUiState(
    val isEditing: Boolean = false,
    val isLoading: Boolean = false,
    val isSaving: Boolean = false,

    val itemName: String = "",
    val packagingStyle: String = "packet",
    val packageQuantity: String = "",
    val purchaseCost: String = "",
    val sellingPrice: String = "",
    val mrp: String = "",
    val currentStock: String = "0",
    val lowStockThreshold: String = "10",
    val selectedCategoryId: Int? = null,

    val categories: List<CategoryDto> = emptyList(),

    // Calculated
    val marginPercent: Double? = null,
    val profitPerUnit: Double = 0.0,

    val nameError: String? = null,
    val error: String? = null,
)

@HiltViewModel
class ItemFormViewModel @Inject constructor(
    private val api: ApiService,
    savedStateHandle: SavedStateHandle,
) : ViewModel() {

    private val itemId: Int? = savedStateHandle.get<Int>("itemId")

    private val _uiState = MutableStateFlow(ItemFormUiState(isEditing = itemId != null))
    val uiState: StateFlow<ItemFormUiState> = _uiState.asStateFlow()

    init {
        loadData()
    }

    private fun loadData() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }
            try {
                val categories = api.getCategories()
                _uiState.update { it.copy(categories = categories) }

                if (itemId != null) {
                    val item = api.getItem(itemId)
                    _uiState.update {
                        it.copy(
                            itemName = item.itemName,
                            packagingStyle = item.packagingStyle ?: "packet",
                            packageQuantity = item.packageQuantityGrams.toString(),
                            purchaseCost = item.purchaseCost.toString(),
                            sellingPrice = item.sellingPrice.toString(),
                            mrp = item.mrp?.toString() ?: "",
                            currentStock = item.currentStock.toString(),
                            lowStockThreshold = item.lowStockThreshold.toString(),
                            selectedCategoryId = item.categoryId,
                        )
                    }
                    recalculateMargin()
                }

                _uiState.update { it.copy(isLoading = false) }
            } catch (e: Exception) {
                _uiState.update { it.copy(isLoading = false, error = "Failed to load") }
            }
        }
    }

    fun onItemNameChange(value: String) {
        _uiState.update { it.copy(itemName = value, nameError = null) }
    }

    fun onPackagingStyleChange(style: String) {
        _uiState.update { it.copy(packagingStyle = style) }
    }

    fun onPackageQuantityChange(value: String) {
        _uiState.update { it.copy(packageQuantity = value) }
    }

    fun onPurchaseCostChange(value: String) {
        _uiState.update { it.copy(purchaseCost = value) }
        recalculateMargin()
    }

    fun onSellingPriceChange(value: String) {
        _uiState.update { it.copy(sellingPrice = value) }
        recalculateMargin()
    }

    fun onMrpChange(value: String) {
        _uiState.update { it.copy(mrp = value) }
    }

    fun onStockChange(value: String) {
        _uiState.update { it.copy(currentStock = value) }
    }

    fun onThresholdChange(value: String) {
        _uiState.update { it.copy(lowStockThreshold = value) }
    }

    fun onCategoryChange(categoryId: Int) {
        _uiState.update {
            it.copy(selectedCategoryId = if (it.selectedCategoryId == categoryId) null else categoryId)
        }
    }

    fun save(onSuccess: () -> Unit) {
        val state = _uiState.value
        if (state.itemName.isBlank()) {
            _uiState.update { it.copy(nameError = "Item name is required") }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isSaving = true, error = null) }
            try {
                val request = CreateItemRequest(
                    itemName = state.itemName.trim(),
                    packageQuantityGrams = state.packageQuantity.toDoubleOrNull() ?: 0.0,
                    purchaseCost = state.purchaseCost.toDoubleOrNull() ?: 0.0,
                    sellingPrice = state.sellingPrice.toDoubleOrNull() ?: 0.0,
                    mrp = state.mrp.toDoubleOrNull(),
                    packagingStyle = state.packagingStyle,
                    categoryId = state.selectedCategoryId,
                    currentStock = state.currentStock.toIntOrNull(),
                    lowStockThreshold = state.lowStockThreshold.toIntOrNull(),
                )

                if (itemId != null) {
                    api.updateItem(itemId, request)
                } else {
                    api.createItem(request)
                }

                _uiState.update { it.copy(isSaving = false) }
                onSuccess()
            } catch (e: Exception) {
                _uiState.update { it.copy(isSaving = false, error = "Failed to save item") }
            }
        }
    }

    private fun recalculateMargin() {
        val state = _uiState.value
        val cost = state.purchaseCost.toDoubleOrNull()
        val sell = state.sellingPrice.toDoubleOrNull()

        if (cost != null && sell != null && cost > 0) {
            val profit = sell - cost
            val margin = (profit / sell) * 100
            _uiState.update { it.copy(marginPercent = margin, profitPerUnit = profit) }
        } else {
            _uiState.update { it.copy(marginPercent = null, profitPerUnit = 0.0) }
        }
    }
}
