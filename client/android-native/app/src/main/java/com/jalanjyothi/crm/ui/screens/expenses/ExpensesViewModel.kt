package com.jalanjyothi.crm.ui.screens.expenses

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.jalanjyothi.crm.data.remote.CreateExpenseRequest
import com.jalanjyothi.crm.data.remote.ExpenseDto
import com.jalanjyothi.crm.data.repository.OfflineRepository
import com.jalanjyothi.crm.data.repository.toExpenseDto
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.time.LocalDate
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

@OptIn(ExperimentalCoroutinesApi::class)
@HiltViewModel
class ExpensesViewModel @Inject constructor(
    private val repository: OfflineRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(ExpensesUiState())
    val uiState: StateFlow<ExpensesUiState> = _uiState.asStateFlow()

    private val _formState = MutableStateFlow(ExpenseFormState())
    val formState: StateFlow<ExpenseFormState> = _formState.asStateFlow()

    private val _period = MutableStateFlow("month")

    init {
        // Observe Room — updates reactively as expenses are added/deleted and never
        // fails just because there's no server connection.
        viewModelScope.launch {
            _period.flatMapLatest { period ->
                repository.observeExpenses().map { entities -> period to entities }
            }.collect { (period, entities) ->
                val filtered = filterByPeriod(entities.map { it.toExpenseDto() }, period)
                val breakdown = filtered
                    .groupBy { it.category }
                    .mapValues { (_, expenses) -> expenses.sumOf { it.amount } }
                    .toList()
                    .sortedByDescending { it.second }
                    .toMap()
                _uiState.update {
                    it.copy(
                        expenses = filtered,
                        totalAmount = filtered.sumOf { e -> e.amount },
                        categoryBreakdown = breakdown,
                        selectedPeriod = period,
                        isLoading = false,
                    )
                }
            }
        }
        // Background refresh from server when available; silently no-ops offline.
        viewModelScope.launch { repository.syncExpenses() }
    }

    private fun filterByPeriod(expenses: List<ExpenseDto>, period: String): List<ExpenseDto> {
        val today = LocalDate.now()
        val from = when (period) {
            "today" -> today
            "week" -> today.minusDays(7)
            "month" -> today.withDayOfMonth(1)
            else -> null
        }
        return if (from == null) expenses else expenses.filter {
            val date = runCatching { LocalDate.parse(it.expenseDate.take(10)) }.getOrNull()
            date != null && !date.isBefore(from) && !date.isAfter(today)
        }
    }

    fun onPeriodChange(period: String) {
        _period.value = period
    }

    fun deleteExpense(id: Int) {
        viewModelScope.launch {
            try {
                repository.deleteExpenseLocal(id)
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
                repository.createExpenseLocal(request)
                _formState.value = ExpenseFormState() // Reset form
                onSuccess()
            } catch (e: Exception) {
                _formState.update { it.copy(isSaving = false) }
            }
        }
    }
}
