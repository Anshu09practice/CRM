package com.jalanjyothi.crm.ui.screens.home

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.jalanjyothi.crm.data.local.AuthTokenStore
import com.jalanjyothi.crm.data.remote.ApiService
import com.jalanjyothi.crm.data.remote.DashboardSummary
import com.jalanjyothi.crm.data.remote.ItemDto
import com.jalanjyothi.crm.data.remote.SalesTrendItem
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.async
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.time.LocalTime
import javax.inject.Inject

data class HomeUiState(
    val isLoading: Boolean = true,
    val greeting: String = "",
    val username: String = "",
    val summary: DashboardSummary? = null,
    val salesTrend: List<SalesTrendItem> = emptyList(),
    val lowStockItems: List<ItemDto> = emptyList(),
    val error: String? = null,
)

@HiltViewModel
class HomeViewModel @Inject constructor(
    private val api: ApiService,
    private val tokenStore: AuthTokenStore,
) : ViewModel() {

    private val _uiState = MutableStateFlow(HomeUiState())
    val uiState: StateFlow<HomeUiState> = _uiState.asStateFlow()

    init {
        loadDashboard()
    }

    fun loadDashboard() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }

            val username = tokenStore.username.first() ?: "there"
            val greeting = getGreeting()

            _uiState.update { it.copy(greeting = greeting, username = username) }

            try {
                val summaryDeferred = async { api.getDashboardSummary() }
                val trendDeferred = async { api.getSalesTrend() }
                val lowStockDeferred = async { api.getLowStockItems() }

                _uiState.update {
                    it.copy(
                        isLoading = false,
                        summary = summaryDeferred.await(),
                        salesTrend = trendDeferred.await(),
                        lowStockItems = lowStockDeferred.await(),
                    )
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(isLoading = false, error = "Couldn't load dashboard")
                }
            }
        }
    }

    private fun getGreeting(): String {
        val hour = LocalTime.now().hour
        return when {
            hour < 12 -> "Good morning"
            hour < 17 -> "Good afternoon"
            else -> "Good evening"
        }
    }
}
