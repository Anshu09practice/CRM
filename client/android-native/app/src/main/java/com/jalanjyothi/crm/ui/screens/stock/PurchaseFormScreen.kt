package com.jalanjyothi.crm.ui.screens.stock

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.expandVertically
import androidx.compose.animation.fadeIn
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowBack
import androidx.compose.material.icons.automirrored.outlined.Notes
import androidx.compose.material.icons.outlined.DateRange
import androidx.compose.material.icons.outlined.Inventory2
import androidx.compose.material.icons.outlined.ShoppingCart
import androidx.compose.material.icons.outlined.Sell
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.ExposedDropdownMenuDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.MenuAnchorType
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.jalanjyothi.crm.ui.components.AppTextField
import com.jalanjyothi.crm.ui.components.PrimaryButton
import com.jalanjyothi.crm.ui.components.formatCurrency

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PurchaseFormScreen(
    onBack: () -> Unit,
    viewModel: PurchaseFormViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Record Purchase") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Outlined.ArrowBack, contentDescription = "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.background,
                ),
            )
        },
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .verticalScroll(rememberScrollState())
                .padding(24.dp),
            verticalArrangement = Arrangement.spacedBy(20.dp),
        ) {

            // ─── Item Selector ────────────────────────────────────────────────
            Text(
                "Select Item",
                style = MaterialTheme.typography.labelLarge,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            ExposedDropdownMenuBox(
                expanded = uiState.isDropdownExpanded,
                onExpandedChange = { expanded ->
                    if (!expanded) viewModel.onDropdownDismiss()
                },
            ) {
                OutlinedTextField(
                    value = uiState.itemQuery,
                    onValueChange = viewModel::onItemQueryChange,
                    modifier = Modifier
                        .fillMaxWidth()
                        .menuAnchor(MenuAnchorType.PrimaryEditable),
                    label = { Text("Search item name") },
                    leadingIcon = { Icon(Icons.Outlined.Inventory2, contentDescription = null) },
                    trailingIcon = {
                        ExposedDropdownMenuDefaults.TrailingIcon(expanded = uiState.isDropdownExpanded)
                    },
                    isError = uiState.itemError != null,
                    singleLine = true,
                    colors = OutlinedTextFieldDefaults.colors(),
                )
                if (uiState.filteredItems.isNotEmpty()) {
                    ExposedDropdownMenu(
                        expanded = uiState.isDropdownExpanded,
                        onDismissRequest = viewModel::onDropdownDismiss,
                    ) {
                        uiState.filteredItems.take(10).forEach { item ->
                            DropdownMenuItem(
                                text = {
                                    Column {
                                        Text(
                                            item.itemName,
                                            style = MaterialTheme.typography.bodyMedium,
                                        )
                                        Text(
                                            "Stock: ${item.currentStock}  ·  ${formatCurrency(item.purchaseCost)}/unit",
                                            style = MaterialTheme.typography.labelSmall,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                                        )
                                    }
                                },
                                onClick = { viewModel.onItemSelect(item) },
                            )
                        }
                    }
                }
            }
            uiState.itemError?.let {
                Text(
                    it,
                    color = MaterialTheme.colorScheme.error,
                    style = MaterialTheme.typography.labelSmall,
                    modifier = Modifier.padding(start = 4.dp),
                )
            }

            // ─── Selected Item Info Card ───────────────────────────────────────
            AnimatedVisibility(
                visible = uiState.selectedItem != null,
                enter = expandVertically() + fadeIn(),
            ) {
                uiState.selectedItem?.let { item ->
                    Card(
                        colors = CardDefaults.cardColors(
                            containerColor = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.4f),
                        ),
                        shape = MaterialTheme.shapes.medium,
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(16.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Column {
                                Text(
                                    item.itemName,
                                    style = MaterialTheme.typography.titleSmall,
                                    fontWeight = FontWeight.SemiBold,
                                )
                                Text(
                                    "${item.packageQuantityGrams}g · ${item.packagingStyle ?: "packet"}",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                            }
                            Column(horizontalAlignment = Alignment.End) {
                                Text(
                                    "${item.currentStock} in stock",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                                Text(
                                    formatCurrency(item.purchaseCost),
                                    style = MaterialTheme.typography.titleSmall,
                                    fontWeight = FontWeight.SemiBold,
                                    color = MaterialTheme.colorScheme.primary,
                                )
                            }
                        }
                    }
                }
            }

            // ─── Quantity ─────────────────────────────────────────────────────
            AppTextField(
                value = uiState.quantity,
                onValueChange = viewModel::onQuantityChange,
                label = "Quantity (units)",
                leadingIcon = Icons.Outlined.ShoppingCart,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                error = uiState.quantityError,
            )

            // ─── Purchase Cost ────────────────────────────────────────────────
            AppTextField(
                value = uiState.purchaseCost,
                onValueChange = viewModel::onPurchaseCostChange,
                label = "Purchase Cost per unit (₹)",
                leadingIcon = Icons.Outlined.Sell,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
            )

            // ─── Total Preview ────────────────────────────────────────────────
            val total = (uiState.quantity.toIntOrNull() ?: 0) *
                    (uiState.purchaseCost.toDoubleOrNull() ?: 0.0)
            if (total > 0) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.End,
                ) {
                    Text(
                        "Total: ${formatCurrency(total)}",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold,
                        color = MaterialTheme.colorScheme.primary,
                    )
                }
            }

            // ─── Purchase Date ────────────────────────────────────────────────
            AppTextField(
                value = uiState.purchaseDate,
                onValueChange = viewModel::onDateChange,
                label = "Purchase Date (YYYY-MM-DD)",
                leadingIcon = Icons.Outlined.DateRange,
            )

            // ─── Notes ────────────────────────────────────────────────────────
            AppTextField(
                value = uiState.notes,
                onValueChange = viewModel::onNotesChange,
                label = "Notes (optional)",
                leadingIcon = Icons.AutoMirrored.Outlined.Notes,
                singleLine = false,
            )

            // ─── Error ────────────────────────────────────────────────────────
            uiState.error?.let { err ->
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.errorContainer,
                    ),
                    shape = MaterialTheme.shapes.medium,
                ) {
                    Text(
                        err,
                        modifier = Modifier.padding(12.dp),
                        color = MaterialTheme.colorScheme.onErrorContainer,
                        style = MaterialTheme.typography.bodyMedium,
                    )
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            // ─── Submit ───────────────────────────────────────────────────────
            PrimaryButton(
                text = "Record Purchase",
                onClick = { viewModel.save(onBack) },
                loading = uiState.isSaving,
            )

            Spacer(modifier = Modifier.height(24.dp))
        }
    }
}
