package com.jalanjyothi.crm.ui.screens.stock

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowBack
import androidx.compose.material.icons.outlined.CheckCircle
import androidx.compose.material.icons.outlined.Inventory2
import androidx.compose.material.icons.outlined.Search
import androidx.compose.material3.Badge
import androidx.compose.material3.BadgedBox
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
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
import com.jalanjyothi.crm.ui.components.EmptyState
import com.jalanjyothi.crm.ui.components.ShimmerListItem
import com.jalanjyothi.crm.ui.theme.Warning500

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BulkUpdateScreen(
    onBack: () -> Unit,
    viewModel: BulkUpdateViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsState()
    val modifiedCount = viewModel.modifiedCount()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Bulk Update Prices") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Outlined.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    // Modified badge
                    if (modifiedCount > 0) {
                        BadgedBox(badge = { Badge { Text("$modifiedCount") } }) {
                            Icon(
                                Icons.Outlined.CheckCircle,
                                contentDescription = "$modifiedCount items modified",
                                tint = MaterialTheme.colorScheme.primary,
                            )
                        }
                        Spacer(Modifier.width(16.dp))
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.background,
                ),
            )
        },
        bottomBar = {
            if (modifiedCount > 0) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(MaterialTheme.colorScheme.background)
                        .padding(16.dp),
                ) {
                    Button(
                        onClick = { viewModel.saveChanges(onBack) },
                        modifier = Modifier.fillMaxWidth(),
                        enabled = !uiState.isSaving,
                    ) {
                        if (uiState.isSaving) {
                            CircularProgressIndicator(
                                modifier = Modifier
                                    .height(20.dp)
                                    .width(20.dp),
                                strokeWidth = 2.dp,
                                color = MaterialTheme.colorScheme.onPrimary,
                            )
                        } else {
                            Text("Save $modifiedCount Change${if (modifiedCount == 1) "" else "s"}")
                        }
                    }
                }
            }
        },
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding),
        ) {
            // Info banner
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 8.dp),
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.secondaryContainer.copy(alpha = 0.5f),
                ),
                shape = MaterialTheme.shapes.medium,
            ) {
                Text(
                    "Edit purchase cost, selling price, or MRP for any item. Tap a field to change it. Modified items are highlighted.",
                    modifier = Modifier.padding(12.dp),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }

            // Search
            AppTextField(
                value = uiState.searchQuery,
                onValueChange = viewModel::onSearchChange,
                placeholder = "Filter items",
                leadingIcon = Icons.Outlined.Search,
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
            )

            // Error
            uiState.error?.let { err ->
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 4.dp),
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.errorContainer,
                    ),
                ) {
                    Text(
                        err,
                        modifier = Modifier.padding(12.dp),
                        color = MaterialTheme.colorScheme.onErrorContainer,
                        style = MaterialTheme.typography.bodySmall,
                    )
                }
            }

            when {
                uiState.isLoading -> {
                    LazyColumn {
                        items(8) { ShimmerListItem() }
                    }
                }
                uiState.filteredItems.isEmpty() -> {
                    EmptyState(
                        icon = Icons.Outlined.Inventory2,
                        title = "No items found",
                        subtitle = "Try a different search term",
                    )
                }
                else -> {
                    LazyColumn(
                        contentPadding = PaddingValues(
                            start = 16.dp,
                            end = 16.dp,
                            top = 4.dp,
                            bottom = 120.dp,
                        ),
                        verticalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        items(uiState.filteredItems, key = { it.id }) { item ->
                            BulkItemRow(
                                item = item,
                                onPurchaseCostChange = { viewModel.onPurchaseCostChange(item.id, it) },
                                onSellingPriceChange = { viewModel.onSellingPriceChange(item.id, it) },
                                onMrpChange = { viewModel.onMrpChange(item.id, it) },
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun BulkItemRow(
    item: BulkItemState,
    onPurchaseCostChange: (String) -> Unit,
    onSellingPriceChange: (String) -> Unit,
    onMrpChange: (String) -> Unit,
) {
    val borderColor = if (item.isModified) {
        Warning500.copy(alpha = 0.6f)
    } else {
        MaterialTheme.colorScheme.surface
    }

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = MaterialTheme.shapes.medium,
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = if (item.isModified) {
            androidx.compose.foundation.BorderStroke(1.5.dp, Warning500.copy(alpha = 0.5f))
        } else null,
        elevation = CardDefaults.cardElevation(defaultElevation = 0.5.dp),
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            // Item name + category
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        item.itemName,
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.SemiBold,
                    )
                    if (!item.categoryName.isNullOrBlank()) {
                        Text(
                            item.categoryName,
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
                if (item.isModified) {
                    Text(
                        "Modified",
                        style = MaterialTheme.typography.labelSmall,
                        color = Warning500,
                        fontWeight = FontWeight.SemiBold,
                    )
                }
            }

            Spacer(Modifier.height(10.dp))

            // Price fields row
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                CompactPriceField(
                    value = item.purchaseCost,
                    onValueChange = onPurchaseCostChange,
                    label = "Buy ₹",
                    modifier = Modifier.weight(1f),
                )
                CompactPriceField(
                    value = item.sellingPrice,
                    onValueChange = onSellingPriceChange,
                    label = "Sell ₹",
                    modifier = Modifier.weight(1f),
                )
                CompactPriceField(
                    value = item.mrp,
                    onValueChange = onMrpChange,
                    label = "MRP ₹",
                    modifier = Modifier.weight(1f),
                )
            }
        }
    }
}

@Composable
private fun CompactPriceField(
    value: String,
    onValueChange: (String) -> Unit,
    label: String,
    modifier: Modifier = Modifier,
) {
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        modifier = modifier,
        label = { Text(label, style = MaterialTheme.typography.labelSmall) },
        textStyle = MaterialTheme.typography.bodySmall,
        singleLine = true,
        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
        colors = OutlinedTextFieldDefaults.colors(),
    )
}
