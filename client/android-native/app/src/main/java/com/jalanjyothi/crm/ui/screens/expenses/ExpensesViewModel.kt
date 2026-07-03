package com.jalanjyothi.crm.ui.screens.expenses

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.jalanjyothi.crm.data.remote.ApiService
import com.jalanjyothi.crm.data.remote.CreateExpenseRequest
import com.jalanjyothi.crm.data.remote.ExpenseDto
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import javax.inject.Inject

data class ExpensesUiState(
    val expenses: List<ExpenseDto> = emptyList(),
    val totalAmount: Double = 0.0,
    val categoryBreakdown: Map<String, Double> = emptyMap(),
    val selectedPeriod: String = "month",
    val isLoading: Boolean = true,
    val error: String? = null,
)

data class ExpenseFormState(
    val category: String = "",
    val amount: String = "",
    val description: String = "",
    val isSaving: Boolean = false,
)

@HiltViewModel
class ExpensesViewModel @Inject constructor(
    private val api: ApiService,
) : ViewModel() {

    private val _uiState = MutableStateFlow(ExpensesUiState())
    val uiState: StateFlow<ExpensesUiState> = _uiState.asStateFlow()

    private val _formState = MutableStateFlow(ExpenseFormState())
    val formState: StateFlow<ExpenseFormState> = _formState.asStateFlow()

    init {
        loadExpenses()
    }

    fun onPeriodChange(period: String) {
        _uiState.update { it.copy(selectedPeriod = period) }
        loadExpenses()
    }

    private fun loadExpenses() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }
            try {
                val today = LocalDate.now()
                val formatter = DateTimeFormatter.ISO_LOCAL_DATE

                val (fromDate, toDate) = when (_uiState.value.selectedPeriod) {
                    "today" -> today.format(formatter) to today.format(formatter)
                    "week" -> today.minusDays(7).format(formatter) to today.format(formatter)
                    "month" -> today.withDayOfMonth(1).format(formatter) to today.format(formatter)
                    else -> null to null
                }

                val response = api.getExpenses(fromDate = fromDate, toDate = toDate)

                // Calculate category breakdown
                val breakdown = response.expenses
                    .groupBy { it.category }
                    .mapValues { (_, expenses) -> expenses.sumOf { it.amount } }
                    .toList()
                    .sortedByDescending { it.second }
                    .toMap()

                _uiState.update {
                    it.copy(
                        expenses = response.expenses,
                        totalAmount = response.totalAmount,
                        categoryBreakdown = breakdown,
                        isLoading = false,
                    )
                }
            } catch (e: Exception) {
                _uiState.update { it.copy(isLoading = false, error = "Couldn't load expenses") }
            }
        }
    }

    fun deleteExpense(id: Int) {
        viewModelScope.launch {
            try {
                api.deleteExpense(id)
                _uiState.update { state ->
                    val updated = state.expenses.filter { it.id != id }
                    state.copy(
                        expenses = updated,
                        totalAmount = updated.sumOf { it.amount },
                    )
                }
            } catch (_: Exception) { }
        }
    }

    // ─── Form ─────────────────────────────────────────────────────────────────

    fun onCategoryFormChange(value: String) {
        _formState.update { it.copy(category = value) }
    }

    fun onAmountFormChange(value: String) {
        _formState.update { it.copy(amount = value) }
    }

    fun onDescriptionFormChange(value: String) {
        _formState.update { it.copy(description = value) }
    }

    fun addExpense(onSuccess: () -> Unit) {
        val form = _formState.value
        viewModelScope.launch {
            _formState.update { it.copy(isSaving = true) }
            try {
                val request = CreateExpenseRequest(
                    category = form.category.trim(),
                    amount = form.amount.toDoubleOrNull() ?: 0.0,
                    description = form.description.ifBlank { null },
                )
                api.createExpense(request)
                _formState.value = ExpenseFormState() // Reset form
                onSuccess()
                loadExpenses() // Refresh list
            } catch (e: Exception) {
                _formState.update { it.copy(isSaving = false) }
            }
        }
    }
}
