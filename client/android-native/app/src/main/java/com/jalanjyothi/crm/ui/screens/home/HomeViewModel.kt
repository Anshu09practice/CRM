package com.jalanjyothi.crm.ui.screens.home

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.jalanjyothi.crm.data.local.AuthTokenStore
import com.jalanjyothi.crm.data.remote.ApiService
import com.jalanjyothi.crm.data.remote.DashboardSummary
import com.jalanjyothi.crm.data.remote.ItemDto
import com.jalanjyothi.crm.data.remote.SalesTrendItem
import com.jalanjyothi.crm.data.repository.OfflineRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.async
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.coroutines.supervisorScope
import java.time.LocalTime
import javax.inject.Inject

data class HomeUiState(
    val isLoading: Boolean = true,
    val greeting: String = "",
    val username: String = "",
    val summary: DashboardSummary? = null,
    val salesTrend: List<SalesTrendItem> = emptyList(),
    val lowStockItems: List<ItemDto> = emptyList(),
    val isOffline: Boolean = false,
    val error: String? = null,
)

@HiltViewModel
class HomeViewModel @Inject constructor(
    private val api: ApiService,
    private val repository: OfflineRepository,
    private val tokenStore: AuthTokenStore,
) : ViewModel() {

    private val _uiState = MutableStateFlow(HomeUiState())
    val uiState: StateFlow<HomeUiState> = _uiState.asStateFlow()

    init {
        loadDashboard()
    }

    fun loadDashboard() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null, isOffline = false) }

            val username = tokenStore.username.first() ?: "there"
            val greeting = getGreeting()
            _uiState.update { it.copy(greeting = greeting, username = username) }

            // Skip network entirely if no server URL is configured — go straight to
            // local Room data without waiting for a connection timeout.
            val serverUrl = tokenStore.serverUrl.first()
            if (serverUrl.isBlank()) {
                loadLocalDashboard()
                return@launch
            }

            // Try live server data first
            try {
                // supervisorScope prevents a ConnectException from one async block
                // from cancelling the other concurrent calls and escaping the try-catch.
                supervisorScope {
                    val summaryDeferred   = async { api.getDashboardSummary() }
                    val trendDeferred     = async { api.getSalesTrend() }
                    val lowStockDeferred  = async { api.getLowStockItems() }

                    // Background sync so local Room stays fresh for next offline session
                    launch { repository.syncItems() }

                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            summary = summaryDeferred.await(),
                            salesTrend = trendDeferred.await(),
                            lowStockItems = lowStockDeferred.await(),
                            isOffline = false,
                        )
                    }
                }
            } catch (_: Exception) {
                // Server unreachable — load from local Room data
                loadLocalDashboard()
            }
        }
    }

    private suspend fun loadLocalDashboard() {
        try {
            val localSummary  = repository.computeLocalDashboard()
            val localLowStock = repository.getLocalLowStockItems()
            _uiState.update {
                it.copy(
                    isLoading = false,
                    summary = localSummary,
                    salesTrend = emptyList(),
                    lowStockItems = localLowStock,
                    isOffline = true,
                )
            }
        } catch (e: Exception) {
            _uiState.update {
                it.copy(isLoading = false, error = "Couldn't load dashboard")
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
