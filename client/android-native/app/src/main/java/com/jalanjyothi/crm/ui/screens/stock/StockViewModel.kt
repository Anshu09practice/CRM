package com.jalanjyothi.crm.ui.screens.stock

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.jalanjyothi.crm.data.remote.ItemDto
import com.jalanjyothi.crm.data.repository.OfflineRepository
import com.jalanjyothi.crm.data.repository.toItemDto
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

data class StockUiState(
    val items: List<ItemDto> = emptyList(),
    val isLoading: Boolean = true,
    val searchQuery: String = "",
    val error: String? = null,
)

@OptIn(FlowPreview::class, ExperimentalCoroutinesApi::class)
@HiltViewModel
class StockViewModel @Inject constructor(
    private val repository: OfflineRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(StockUiState())
    val uiState: StateFlow<StockUiState> = _uiState.asStateFlow()

    private val _searchQuery = MutableStateFlow("")

    init {
        // Observe Room — never fails even without a server
        viewModelScope.launch {
            _searchQuery
                .debounce(300)
                .flatMapLatest { query ->
                    if (query.isBlank()) repository.observeItems()
                    else repository.searchItems(query)
                }
                .collect { entities ->
                    _uiState.update {
                        it.copy(items = entities.map { e -> e.toItemDto() }, isLoading = false)
                    }
                }
        }
        // Kick off a background sync from the server
        syncItems()
    }

    fun onSearchChange(query: String) {
        _searchQuery.value = query
        _uiState.update { it.copy(searchQuery = query) }
    }

    fun syncItems() {
        viewModelScope.launch {
            repository.syncItems() // silently updates Room; UI reacts via the Flow above
        }
    }
}
