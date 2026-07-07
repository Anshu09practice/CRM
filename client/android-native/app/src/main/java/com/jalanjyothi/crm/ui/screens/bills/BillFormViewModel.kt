package com.jalanjyothi.crm.ui.screens.bills

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.jalanjyothi.crm.data.remote.BillLineItem
import com.jalanjyothi.crm.data.remote.CreateBillRequest
import com.jalanjyothi.crm.data.remote.CustomerDto
import com.jalanjyothi.crm.data.remote.ItemDto
import com.jalanjyothi.crm.data.repository.OfflineRepository
import com.jalanjyothi.crm.data.repository.toCustomerDto
import com.jalanjyothi.crm.data.repository.toItemDto
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class BillFormUiState(
    // Steps
    val currentStep: Int = 0, // 0=Customer, 1=Items, 2=Review

    // Customer
    val customerName: String = "",
    val customerPhone: String = "",
    val customerSearch: String = "",
    val selectedCustomerId: Int? = null,
    val customers: List<CustomerDto> = emptyList(),
    val showCustomerSuggestions: Boolean = false,

    // Items
    val availableItems: List<ItemDto> = emptyList(),
    val itemSearch: String = "",
    val selectedItems: List<SelectedLineItem> = emptyList(),

    // Review
    val discountPercent: Double = 0.0,
    val notes: String = "",
    val paymentMethod: String = "cash",

    // Calculated
    val subtotal: Double = 0.0,
    val discountAmount: Double = 0.0,
    val total: Double = 0.0,

    // State
    val isLoading: Boolean = false,
    val isSaving: Boolean = false,
    val isSuccess: Boolean = false,
    val error: String? = null,
    val isEditing: Boolean = false,
)

data class SelectedLineItem(
    val itemId: Int,
    val itemName: String,
    val quantity: Int = 1,
    val sellingPrice: Double,
    val maxStock: Int,
    val lineTotal: Double = sellingPrice,
)

@HiltViewModel
class BillFormViewModel @Inject constructor(
    private val repository: OfflineRepository,
    savedStateHandle: SavedStateHandle,
) : ViewModel() {

    private val billId: Int? = savedStateHandle.get<Int>("billId")

    private val _uiState = MutableStateFlow(BillFormUiState(isEditing = billId != null))
    val uiState: StateFlow<BillFormUiState> = _uiState.asStateFlow()

    init {
        loadInitialData()
    }

    private fun loadInitialData() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }
            try {
                val customers = repository.observeCustomers().first().map { it.toCustomerDto() }
                val items = repository.observeItems().first().map { it.toItemDto() }
                _uiState.update {
                    it.copy(
                        customers = customers,
                        availableItems = items.filter { item -> item.currentStock > 0 },
                        isLoading = false,
                    )
                }

                // If editing, load existing bill
                if (billId != null) {
                    val bill = repository.getBillById(billId)
                    if (bill != null) {
                        _uiState.update {
                            it.copy(
                                customerName = bill.customerName,
                                customerPhone = bill.customerPhone ?: "",
                                selectedCustomerId = bill.customerId,
                                selectedItems = bill.items?.map { item ->
                                    SelectedLineItem(
                                        itemId = item.itemId,
                                        itemName = item.itemName,
                                        quantity = item.quantity,
                                        sellingPrice = item.sellingPrice,
                                        maxStock = 999,
                                        lineTotal = item.lineTotal,
                                    )
                                } ?: emptyList(),
                                discountPercent = bill.discountPercent,
                                notes = bill.notes ?: "",
                            )
                        }
                        recalculateTotals()
                    }
                }
            } catch (e: Exception) {
                _uiState.update { it.copy(isLoading = false, error = "Failed to load data") }
            }
        }
    }

    // ─── Customer Step ────────────────────────────────────────────────────────

    fun onCustomerSearchChange(query: String) {
        _uiState.update {
            it.copy(
                customerSearch = query,
                customerName = query,
                showCustomerSuggestions = query.length >= 2,
                selectedCustomerId = null,
            )
        }
    }

    fun onCustomerSelected(customer: CustomerDto) {
        _uiState.update {
            it.copy(
                customerName = customer.name,
                customerPhone = customer.phone ?: "",
                selectedCustomerId = customer.id,
                customerSearch = customer.name,
                showCustomerSuggestions = false,
            )
        }
    }

    fun onCustomerPhoneChange(phone: String) {
        _uiState.update { it.copy(customerPhone = phone) }
    }

    fun dismissSuggestions() {
        _uiState.update { it.copy(showCustomerSuggestions = false) }
    }

    // ─── Items Step ───────────────────────────────────────────────────────────

    fun onItemSearchChange(query: String) {
        _uiState.update { it.copy(itemSearch = query) }
    }

    fun onAddItem(item: ItemDto) {
        val current = _uiState.value.selectedItems
        if (current.any { it.itemId == item.id }) return

        _uiState.update {
            it.copy(
                selectedItems = current + SelectedLineItem(
                    itemId = item.id,
                    itemName = item.itemName,
                    quantity = 1,
                    sellingPrice = item.sellingPrice,
                    maxStock = item.currentStock,
                    lineTotal = item.sellingPrice,
                ),
                itemSearch = "",
            )
        }
        recalculateTotals()
    }

    fun onRemoveItem(itemId: Int) {
        _uiState.update {
            it.copy(selectedItems = it.selectedItems.filter { item -> item.itemId != itemId })
        }
        recalculateTotals()
    }

    fun onQuantityChange(itemId: Int, quantity: Int) {
        _uiState.update {
            it.copy(
                selectedItems = it.selectedItems.map { item ->
                    if (item.itemId == itemId) {
                        val qty = quantity.coerceIn(1, item.maxStock)
                        item.copy(quantity = qty, lineTotal = qty * item.sellingPrice)
                    } else item
                },
            )
        }
        recalculateTotals()
    }

    fun onPriceChange(itemId: Int, price: Double) {
        _uiState.update {
            it.copy(
                selectedItems = it.selectedItems.map { item ->
                    if (item.itemId == itemId) {
                        item.copy(sellingPrice = price, lineTotal = item.quantity * price)
                    } else item
                },
            )
        }
        recalculateTotals()
    }

    // ─── Review Step ──────────────────────────────────────────────────────────

    fun onDiscountChange(percent: String) {
        val value = percent.toDoubleOrNull()?.coerceIn(0.0, 100.0) ?: 0.0
        _uiState.update { it.copy(discountPercent = value) }
        recalculateTotals()
    }

    fun onNotesChange(notes: String) {
        _uiState.update { it.copy(notes = notes) }
    }

    fun onPaymentMethodChange(method: String) {
        _uiState.update { it.copy(paymentMethod = method) }
    }

    // ─── Navigation ───────────────────────────────────────────────────────────

    fun nextStep(): Boolean {
        val state = _uiState.value
        when (state.currentStep) {
            0 -> {
                if (state.customerName.isBlank()) {
                    _uiState.update { it.copy(error = "Customer name is required") }
                    return false
                }
                _uiState.update { it.copy(currentStep = 1, error = null) }
            }
            1 -> {
                if (state.selectedItems.isEmpty()) {
                    _uiState.update { it.copy(error = "Add at least one item") }
                    return false
                }
                _uiState.update { it.copy(currentStep = 2, error = null) }
            }
        }
        return true
    }

    fun previousStep() {
        _uiState.update {
            it.copy(currentStep = (it.currentStep - 1).coerceAtLeast(0), error = null)
        }
    }

    // ─── Submit ───────────────────────────────────────────────────────────────

    fun submitBill(onSuccess: () -> Unit) {
        val state = _uiState.value
        viewModelScope.launch {
            _uiState.update { it.copy(isSaving = true, error = null) }
            try {
                val request = CreateBillRequest(
                    customerName = state.customerName,
                    customerPhone = state.customerPhone.ifBlank { null },
                    customerId = state.selectedCustomerId,
                    items = state.selectedItems.map {
                        BillLineItem(
                            itemId = it.itemId,
                            quantity = it.quantity,
                            sellingPrice = it.sellingPrice,
                        )
                    },
                    discountPercent = state.discountPercent,
                    notes = state.notes.ifBlank { null },
                    paymentMethod = state.paymentMethod,
                    amountPaid = state.total, // Full payment by default
                )

                if (billId != null) {
                    repository.updateBillLocal(billId, request)
                } else {
                    repository.createBillLocal(request)
                }

                _uiState.update { it.copy(isSaving = false, isSuccess = true) }
                onSuccess()
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(isSaving = false, error = "Failed to save bill. Try again.")
                }
            }
        }
    }

    // ─── Private ──────────────────────────────────────────────────────────────

    private fun recalculateTotals() {
        _uiState.update {
            val subtotal = it.selectedItems.sumOf { item -> item.lineTotal }
            val discountAmount = subtotal * it.discountPercent / 100.0
            val total = subtotal - discountAmount
            it.copy(subtotal = subtotal, discountAmount = discountAmount, total = total)
        }
    }
}
