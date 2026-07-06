package com.jalanjyothi.crm.ui.screens.stock

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Delete
import androidx.compose.material.icons.outlined.Inventory2
import androidx.compose.material.icons.outlined.Search
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.jalanjyothi.crm.data.remote.PurchaseDto
import com.jalanjyothi.crm.ui.components.AppTextField
import com.jalanjyothi.crm.ui.components.EmptyState
import com.jalanjyothi.crm.ui.components.ShimmerListItem
import com.jalanjyothi.crm.ui.components.formatCurrency
import com.jalanjyothi.crm.ui.theme.Amber700
import com.jalanjyothi.crm.ui.theme.Error500

@Composable
fun PurchasesTab(
    viewModel: PurchasesViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsState()
    var deleteTarget by remember { mutableStateOf<PurchaseDto?>(null) }

    // Delete confirmation dialog
    deleteTarget?.let { purchase ->
        AlertDialog(
            onDismissRequest = { deleteTarget = null },
            title = { Text("Delete Purchase?") },
            text = { Text("Remove the purchase of ${purchase.quantity} × ${purchase.itemName}? This cannot be undone.") },
            confirmButton = {
                TextButton(
                    onClick = {
                        viewModel.deletePurchase(purchase.id)
                        deleteTarget = null
                    },
                ) {
                    Text("Delete", color = Error500)
                }
            },
            dismissButton = {
                TextButton(onClick = { deleteTarget = null }) {
                    Text("Cancel")
                }
            },
        )
    }

    Column(modifier = Modifier.fillMaxSize()) {
        AppTextField(
            value = uiState.searchQuery,
            onValueChange = viewModel::onSearchChange,
            placeholder = "Search purchases by item",
            leadingIcon = Icons.Outlined.Search,
            modifier = Modifier.padding(horizontal = 24.dp, vertical = 12.dp),
        )

        // Summary
        if (!uiState.isLoading && uiState.purchases.isNotEmpty()) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 24.dp, vertical = 8.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                Column {
                    Text("Total Cost", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Text(formatCurrency(uiState.totalCost), style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
                }
                Column(horizontalAlignment = Alignment.End) {
                    Text("Purchases", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Text("${uiState.purchases.size}", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
                }
            }
        }

        when {
            uiState.isLoading -> {
                LazyColumn { items(6) { ShimmerListItem() } }
            }
            uiState.purchases.isEmpty() -> {
                EmptyState(
                    icon = Icons.Outlined.Inventory2,
                    title = "No purchases yet",
                    subtitle = "Tap + to record a stock purchase",
                )
            }
            else -> {
                LazyColumn(
                    contentPadding = PaddingValues(horizontal = 24.dp, vertical = 8.dp),
                    verticalArrangement = Arrangement.spacedBy(6.dp),
                ) {
                    items(uiState.purchases, key = { it.id }) { purchase ->
                        PurchaseCard(
                            purchase = purchase,
                            onDelete = { deleteTarget = purchase },
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun PurchaseCard(
    purchase: PurchaseDto,
    onDelete: () -> Unit,
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = MaterialTheme.shapes.medium,
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.5.dp),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(start = 16.dp, top = 12.dp, bottom = 12.dp, end = 4.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(purchase.itemName, style = MaterialTheme.typography.titleSmall)
                Spacer(Modifier.height(2.dp))
                Text(
                    "${purchase.quantity} units · ${purchase.purchaseDate}",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                purchase.notes?.takeIf { it.isNotBlank() }?.let {
                    Text(
                        it,
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.7f),
                        maxLines = 1,
                    )
                }
            }
            Column(horizontalAlignment = Alignment.End) {
                Text(
                    formatCurrency(purchase.totalCost),
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.SemiBold,
                    color = Amber700,
                )
                Text(
                    "${formatCurrency(purchase.purchaseCost)}/unit",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            IconButton(onClick = onDelete) {
                Icon(
                    Icons.Outlined.Delete,
                    contentDescription = "Delete purchase",
                    tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.6f),
                )
            }
        }
    }
}
