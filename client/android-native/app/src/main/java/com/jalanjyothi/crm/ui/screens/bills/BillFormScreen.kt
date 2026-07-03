package com.jalanjyothi.crm.ui.screens.bills

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.spring
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
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
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Add
import androidx.compose.material.icons.outlined.ArrowBack
import androidx.compose.material.icons.outlined.Close
import androidx.compose.material.icons.outlined.Person
import androidx.compose.material.icons.outlined.Phone
import androidx.compose.material.icons.outlined.Remove
import androidx.compose.material.icons.outlined.Search
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Divider
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilledTonalIconButton
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
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
import com.jalanjyothi.crm.ui.components.SecondaryButton
import com.jalanjyothi.crm.ui.components.formatCurrency

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BillFormScreen(
    billId: Int? = null,
    onBack: () -> Unit,
    viewModel: BillFormViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        when (uiState.currentStep) {
                            0 -> "Customer"
                            1 -> "Add Items"
                            else -> "Review"
                        }
                    )
                },
                navigationIcon = {
                    IconButton(onClick = {
                        if (uiState.currentStep > 0) viewModel.previousStep() else onBack()
                    }) {
                        Icon(Icons.Outlined.ArrowBack, contentDescription = "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.background,
                ),
            )
        },
        bottomBar = {
            BillFormBottomBar(
                step = uiState.currentStep,
                total = uiState.total,
                isSaving = uiState.isSaving,
                onNext = { viewModel.nextStep() },
                onSubmit = { viewModel.submitBill(onBack) },
            )
        },
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding),
        ) {
            // Step indicator
            LinearProgressIndicator(
                progress = { (uiState.currentStep + 1) / 3f },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(2.dp),
                color = MaterialTheme.colorScheme.primary,
                trackColor = MaterialTheme.colorScheme.surfaceVariant,
            )

            // Error banner
            AnimatedVisibility(visible = uiState.error != null) {
                Surface(
                    color = MaterialTheme.colorScheme.errorContainer,
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Text(
                        text = uiState.error ?: "",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onErrorContainer,
                        modifier = Modifier.padding(horizontal = 24.dp, vertical = 8.dp),
                    )
                }
            }

            // Step content with animation
            AnimatedContent(
                targetState = uiState.currentStep,
                transitionSpec = {
                    if (targetState > initialState) {
                        slideInHorizontally { it / 3 } + fadeIn() togetherWith
                                slideOutHorizontally { -it / 3 } + fadeOut()
                    } else {
                        slideInHorizontally { -it / 3 } + fadeIn() togetherWith
                                slideOutHorizontally { it / 3 } + fadeOut()
                    }
                },
                label = "step_transition",
            ) { step ->
                when (step) {
                    0 -> CustomerStep(uiState, viewModel)
                    1 -> ItemsStep(uiState, viewModel)
                    2 -> ReviewStep(uiState, viewModel)
                }
            }
        }
    }
}

// ─── Step 1: Customer ─────────────────────────────────────────────────────────

@Composable
private fun CustomerStep(
    uiState: BillFormUiState,
    viewModel: BillFormViewModel,
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        Text(
            text = "Who is this bill for?",
            style = MaterialTheme.typography.headlineSmall,
            color = MaterialTheme.colorScheme.onBackground,
        )

        Spacer(modifier = Modifier.height(8.dp))

        // Customer name with autocomplete
        Box {
            AppTextField(
                value = uiState.customerSearch.ifEmpty { uiState.customerName },
                onValueChange = viewModel::onCustomerSearchChange,
                label = "Customer Name",
                leadingIcon = Icons.Outlined.Person,
            )

            // Suggestions dropdown
            if (uiState.showCustomerSuggestions) {
                val filtered = uiState.customers.filter {
                    it.name.contains(uiState.customerSearch, ignoreCase = true)
                }.take(5)

                if (filtered.isNotEmpty()) {
                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(top = 64.dp),
                        elevation = CardDefaults.cardElevation(defaultElevation = 4.dp),
                    ) {
                        Column {
                            filtered.forEach { customer ->
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .clickable { viewModel.onCustomerSelected(customer) }
                                        .padding(16.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                ) {
                                    Text(
                                        text = customer.name,
                                        style = MaterialTheme.typography.bodyMedium,
                                        modifier = Modifier.weight(1f),
                                    )
                                    customer.phone?.let {
                                        Text(
                                            text = it,
                                            style = MaterialTheme.typography.bodySmall,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        AppTextField(
            value = uiState.customerPhone,
            onValueChange = viewModel::onCustomerPhoneChange,
            label = "Phone (optional)",
            leadingIcon = Icons.Outlined.Phone,
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
        )
    }
}

// ─── Step 2: Items ────────────────────────────────────────────────────────────

@Composable
private fun ItemsStep(
    uiState: BillFormUiState,
    viewModel: BillFormViewModel,
) {
    Column(modifier = Modifier.fillMaxSize()) {
        // Search bar
        AppTextField(
            value = uiState.itemSearch,
            onValueChange = viewModel::onItemSearchChange,
            placeholder = "Search items to add",
            leadingIcon = Icons.Outlined.Search,
            modifier = Modifier.padding(horizontal = 24.dp, vertical = 8.dp),
        )

        // Available items (filtered)
        if (uiState.itemSearch.isNotBlank()) {
            val filtered = uiState.availableItems.filter {
                it.itemName.contains(uiState.itemSearch, ignoreCase = true) &&
                        uiState.selectedItems.none { sel -> sel.itemId == it.id }
            }.take(8)

            LazyColumn(
                contentPadding = PaddingValues(horizontal = 24.dp),
                verticalArrangement = Arrangement.spacedBy(4.dp),
            ) {
                items(filtered, key = { it.id }) { item ->
                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { viewModel.onAddItem(item) },
                        colors = CardDefaults.cardColors(
                            containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
                        ),
                    ) {
                        Row(
                            modifier = Modifier.padding(12.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(item.itemName, style = MaterialTheme.typography.bodyMedium)
                                Text(
                                    "${item.currentStock} in stock",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                            }
                            Text(
                                formatCurrency(item.sellingPrice),
                                style = MaterialTheme.typography.labelLarge,
                                color = MaterialTheme.colorScheme.primary,
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Icon(
                                Icons.Outlined.Add,
                                contentDescription = "Add",
                                tint = MaterialTheme.colorScheme.primary,
                                modifier = Modifier.size(20.dp),
                            )
                        }
                    }
                }
            }
        }

        // Selected items
        if (uiState.selectedItems.isNotEmpty()) {
            Divider(modifier = Modifier.padding(horizontal = 24.dp, vertical = 12.dp))
            Text(
                text = "Selected (${uiState.selectedItems.size})",
                style = MaterialTheme.typography.labelLarge,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(horizontal = 24.dp),
            )
            Spacer(modifier = Modifier.height(8.dp))

            LazyColumn(
                contentPadding = PaddingValues(horizontal = 24.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier.weight(1f),
            ) {
                items(uiState.selectedItems, key = { it.itemId }) { item ->
                    SelectedItemCard(
                        item = item,
                        onQuantityChange = { viewModel.onQuantityChange(item.itemId, it) },
                        onRemove = { viewModel.onRemoveItem(item.itemId) },
                    )
                }
            }
        }
    }
}

@Composable
private fun SelectedItemCard(
    item: SelectedLineItem,
    onQuantityChange: (Int) -> Unit,
    onRemove: () -> Unit,
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = MaterialTheme.shapes.medium,
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
    ) {
        Row(
            modifier = Modifier.padding(12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(item.itemName, style = MaterialTheme.typography.bodyMedium)
                Text(
                    "${formatCurrency(item.sellingPrice)} each",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }

            // Quantity stepper
            Row(verticalAlignment = Alignment.CenterVertically) {
                FilledTonalIconButton(
                    onClick = { onQuantityChange(item.quantity - 1) },
                    modifier = Modifier.size(32.dp),
                    enabled = item.quantity > 1,
                ) {
                    Icon(Icons.Outlined.Remove, contentDescription = "Decrease", modifier = Modifier.size(16.dp))
                }
                Text(
                    text = "${item.quantity}",
                    style = MaterialTheme.typography.titleSmall,
                    modifier = Modifier.padding(horizontal = 12.dp),
                )
                FilledTonalIconButton(
                    onClick = { onQuantityChange(item.quantity + 1) },
                    modifier = Modifier.size(32.dp),
                    enabled = item.quantity < item.maxStock,
                ) {
                    Icon(Icons.Outlined.Add, contentDescription = "Increase", modifier = Modifier.size(16.dp))
                }
            }

            Spacer(modifier = Modifier.width(12.dp))

            // Line total + remove
            Column(horizontalAlignment = Alignment.End) {
                Text(
                    formatCurrency(item.lineTotal),
                    style = MaterialTheme.typography.labelLarge,
                    fontWeight = FontWeight.SemiBold,
                )
                IconButton(onClick = onRemove, modifier = Modifier.size(24.dp)) {
                    Icon(
                        Icons.Outlined.Close,
                        contentDescription = "Remove",
                        modifier = Modifier.size(14.dp),
                        tint = MaterialTheme.colorScheme.error,
                    )
                }
            }
        }
    }
}

// ─── Step 3: Review ───────────────────────────────────────────────────────────

@Composable
private fun ReviewStep(
    uiState: BillFormUiState,
    viewModel: BillFormViewModel,
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(24.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        // Customer summary
        item {
            Text("Bill Summary", style = MaterialTheme.typography.headlineSmall)
            Spacer(modifier = Modifier.height(16.dp))
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)),
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text("Customer", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Text(uiState.customerName, style = MaterialTheme.typography.titleSmall)
                    if (uiState.customerPhone.isNotBlank()) {
                        Text(uiState.customerPhone, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            }
        }

        // Items summary
        item {
            Text("Items (${uiState.selectedItems.size})", style = MaterialTheme.typography.labelLarge)
        }
        items(uiState.selectedItems) { item ->
            Row(modifier = Modifier.fillMaxWidth()) {
                Text(item.itemName, style = MaterialTheme.typography.bodyMedium, modifier = Modifier.weight(1f))
                Text("×${item.quantity}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Spacer(modifier = Modifier.width(12.dp))
                Text(formatCurrency(item.lineTotal), style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Medium)
            }
        }

        // Discount
        item {
            Divider()
            Spacer(modifier = Modifier.height(8.dp))
            AppTextField(
                value = if (uiState.discountPercent > 0) uiState.discountPercent.toString() else "",
                onValueChange = viewModel::onDiscountChange,
                label = "Discount %",
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
            )
        }

        // Payment method
        item {
            Text("Payment Method", style = MaterialTheme.typography.labelLarge)
            Spacer(modifier = Modifier.height(8.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                listOf("cash", "upi", "card", "credit").forEach { method ->
                    FilterChip(
                        selected = uiState.paymentMethod == method,
                        onClick = { viewModel.onPaymentMethodChange(method) },
                        label = { Text(method.replaceFirstChar { it.uppercase() }) },
                    )
                }
            }
        }

        // Notes
        item {
            AppTextField(
                value = uiState.notes,
                onValueChange = viewModel::onNotesChange,
                label = "Notes (optional)",
                singleLine = false,
            )
        }

        // Totals
        item {
            Divider()
            Spacer(modifier = Modifier.height(8.dp))
            Row(modifier = Modifier.fillMaxWidth()) {
                Text("Subtotal", style = MaterialTheme.typography.bodyMedium, modifier = Modifier.weight(1f))
                Text(formatCurrency(uiState.subtotal), style = MaterialTheme.typography.bodyMedium)
            }
            if (uiState.discountAmount > 0) {
                Row(modifier = Modifier.fillMaxWidth()) {
                    Text("Discount (${uiState.discountPercent}%)", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.weight(1f))
                    Text("-${formatCurrency(uiState.discountAmount)}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.error)
                }
            }
            Spacer(modifier = Modifier.height(8.dp))
            Row(modifier = Modifier.fillMaxWidth()) {
                Text("Total", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
                Text(formatCurrency(uiState.total), style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
            }
        }
    }
}

// ─── Bottom Bar ───────────────────────────────────────────────────────────────

@Composable
private fun BillFormBottomBar(
    step: Int,
    total: Double,
    isSaving: Boolean,
    onNext: () -> Unit,
    onSubmit: () -> Unit,
) {
    Surface(
        tonalElevation = 3.dp,
        modifier = Modifier.fillMaxWidth(),
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 24.dp, vertical = 16.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            if (step > 0) {
                Column(modifier = Modifier.weight(1f)) {
                    Text("Total", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Text(formatCurrency(total), style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                }
            } else {
                Spacer(modifier = Modifier.weight(1f))
            }

            if (step < 2) {
                PrimaryButton(
                    text = "Next",
                    onClick = onNext,
                    modifier = Modifier.width(120.dp),
                )
            } else {
                PrimaryButton(
                    text = "Create Bill",
                    onClick = onSubmit,
                    loading = isSaving,
                    modifier = Modifier.width(160.dp),
                )
            }
        }
    }
}
