package com.jalanjyothi.crm.ui.screens.stock

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.expandVertically
import androidx.compose.animation.fadeIn
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.ArrowBack
import androidx.compose.material.icons.outlined.Inventory2
import androidx.compose.material.icons.outlined.LocalOffer
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SegmentedButton
import androidx.compose.material3.SegmentedButtonDefaults
import androidx.compose.material3.SingleChoiceSegmentedButtonRow
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.jalanjyothi.crm.ui.components.AppTextField
import com.jalanjyothi.crm.ui.components.PrimaryButton
import com.jalanjyothi.crm.ui.components.formatCurrency
import com.jalanjyothi.crm.ui.theme.Error500
import com.jalanjyothi.crm.ui.theme.Success500
import com.jalanjyothi.crm.ui.theme.Warning500

@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun ItemFormScreen(
    itemId: Int? = null,
    onBack: () -> Unit,
    viewModel: ItemFormViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(if (uiState.isEditing) "Edit Item" else "New Item") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Outlined.ArrowBack, contentDescription = "Back")
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
            // ─── Item Name ────────────────────────────────────────────────────
            AppTextField(
                value = uiState.itemName,
                onValueChange = viewModel::onItemNameChange,
                label = "Item Name",
                leadingIcon = Icons.Outlined.Inventory2,
                error = uiState.nameError,
            )

            // ─── Packaging Style Toggle ───────────────────────────────────────
            Text(
                "Packaging Style",
                style = MaterialTheme.typography.labelLarge,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            SingleChoiceSegmentedButtonRow(modifier = Modifier.fillMaxWidth()) {
                SegmentedButton(
                    selected = uiState.packagingStyle == "packet",
                    onClick = { viewModel.onPackagingStyleChange("packet") },
                    shape = SegmentedButtonDefaults.itemShape(index = 0, count = 2),
                ) { Text("Packet") }
                SegmentedButton(
                    selected = uiState.packagingStyle == "standing_package",
                    onClick = { viewModel.onPackagingStyleChange("standing_package") },
                    shape = SegmentedButtonDefaults.itemShape(index = 1, count = 2),
                ) { Text("Standing Pouch") }
            }

            // ─── Weight ───────────────────────────────────────────────────────
            AppTextField(
                value = uiState.packageQuantity,
                onValueChange = viewModel::onPackageQuantityChange,
                label = "Package Weight (grams)",
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
            )

            // ─── Category Chips ───────────────────────────────────────────────
            Text(
                "Category",
                style = MaterialTheme.typography.labelLarge,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            FlowRow(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                uiState.categories.forEach { category ->
                    FilterChip(
                        selected = uiState.selectedCategoryId == category.id,
                        onClick = { viewModel.onCategoryChange(category.id) },
                        label = { Text(category.name) },
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = MaterialTheme.colorScheme.primaryContainer,
                        ),
                    )
                }
            }

            // ─── Pricing Section ──────────────────────────────────────────────
            Text(
                "Pricing",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold,
            )

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                AppTextField(
                    value = uiState.purchaseCost,
                    onValueChange = viewModel::onPurchaseCostChange,
                    label = "Purchase ₹",
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                    modifier = Modifier.weight(1f),
                )
                AppTextField(
                    value = uiState.sellingPrice,
                    onValueChange = viewModel::onSellingPriceChange,
                    label = "Selling ₹",
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                    modifier = Modifier.weight(1f),
                )
            }

            AppTextField(
                value = uiState.mrp,
                onValueChange = viewModel::onMrpChange,
                label = "MRP ₹ (optional)",
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
            )

            // ─── Margin Calculator (Real-time) ────────────────────────────────
            AnimatedVisibility(
                visible = uiState.marginPercent != null,
                enter = expandVertically() + fadeIn(),
            ) {
                val margin = uiState.marginPercent ?: 0.0
                val marginColor = when {
                    margin >= 20 -> Success500
                    margin >= 10 -> Warning500
                    else -> Error500
                }

                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(
                        containerColor = marginColor.copy(alpha = 0.08f),
                    ),
                    shape = MaterialTheme.shapes.medium,
                ) {
                    Row(
                        modifier = Modifier.padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Icon(
                            Icons.Outlined.LocalOffer,
                            contentDescription = null,
                            tint = marginColor,
                            modifier = Modifier.size(20.dp),
                        )
                        Spacer(modifier = Modifier.width(12.dp))
                        Column {
                            Text(
                                "Profit Margin",
                                style = MaterialTheme.typography.labelMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                            Text(
                                "${String.format("%.1f", margin)}%  ·  ${formatCurrency(uiState.profitPerUnit)}",
                                style = MaterialTheme.typography.titleSmall,
                                color = marginColor,
                                fontWeight = FontWeight.SemiBold,
                            )
                        }
                    }
                }
            }

            // ─── Stock ────────────────────────────────────────────────────────
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                AppTextField(
                    value = uiState.currentStock,
                    onValueChange = viewModel::onStockChange,
                    label = "Stock Qty",
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    modifier = Modifier.weight(1f),
                )
                AppTextField(
                    value = uiState.lowStockThreshold,
                    onValueChange = viewModel::onThresholdChange,
                    label = "Low Stock Alert",
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    modifier = Modifier.weight(1f),
                )
            }

            Spacer(modifier = Modifier.height(16.dp))

            // ─── Submit ───────────────────────────────────────────────────────
            PrimaryButton(
                text = if (uiState.isEditing) "Save Changes" else "Add Item",
                onClick = { viewModel.save(onBack) },
                loading = uiState.isSaving,
            )

            Spacer(modifier = Modifier.height(24.dp))
        }
    }
}
