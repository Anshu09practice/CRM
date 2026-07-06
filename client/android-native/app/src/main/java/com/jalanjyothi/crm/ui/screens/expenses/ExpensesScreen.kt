package com.jalanjyothi.crm.ui.screens.expenses

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.expandVertically
import androidx.compose.animation.fadeIn
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
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowBack
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.outlined.AccountBalance
import androidx.compose.material.icons.outlined.Delete
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SegmentedButton
import androidx.compose.material3.SegmentedButtonDefaults
import androidx.compose.material3.SingleChoiceSegmentedButtonRow
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.jalanjyothi.crm.data.remote.ExpenseDto
import com.jalanjyothi.crm.ui.components.AppTextField
import com.jalanjyothi.crm.ui.components.EmptyState
import com.jalanjyothi.crm.ui.components.PrimaryButton
import com.jalanjyothi.crm.ui.components.ShimmerListItem
import com.jalanjyothi.crm.ui.components.formatCurrency
import com.jalanjyothi.crm.ui.theme.Amber600
import com.jalanjyothi.crm.ui.theme.Amber700
import com.jalanjyothi.crm.ui.theme.Error500
import com.jalanjyothi.crm.ui.theme.Success500
import com.jalanjyothi.crm.ui.theme.Teal600
import com.jalanjyothi.crm.ui.theme.Warning500

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ExpensesScreen(
    onBack: () -> Unit,
    viewModel: ExpensesViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsState()
    var showAddSheet by remember { mutableStateOf(false) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Expenses") },
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
        floatingActionButton = {
            FloatingActionButton(
                onClick = { showAddSheet = true },
                shape = MaterialTheme.shapes.extraLarge,
                containerColor = MaterialTheme.colorScheme.primary,
            ) {
                Icon(Icons.Filled.Add, contentDescription = "Add Expense", tint = MaterialTheme.colorScheme.onPrimary)
            }
        },
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding),
        ) {
            // ─── Period Selector ───────────────────────────────────────────────
            SingleChoiceSegmentedButtonRow(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 24.dp, vertical = 8.dp),
            ) {
                val periods = listOf("Today", "Week", "Month", "All")
                periods.forEachIndexed { index, period ->
                    SegmentedButton(
                        selected = uiState.selectedPeriod == period.lowercase(),
                        onClick = { viewModel.onPeriodChange(period.lowercase()) },
                        shape = SegmentedButtonDefaults.itemShape(index = index, count = periods.size),
                    ) {
                        Text(period, style = MaterialTheme.typography.labelMedium)
                    }
                }
            }

            // ─── Total Card ───────────────────────────────────────────────────
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 24.dp, vertical = 8.dp),
                shape = MaterialTheme.shapes.medium,
                colors = CardDefaults.cardColors(
                    containerColor = Amber700.copy(alpha = 0.08f),
                ),
            ) {
                Column(modifier = Modifier.padding(20.dp)) {
                    Text(
                        "Total Expenses",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    Text(
                        formatCurrency(uiState.totalAmount),
                        style = MaterialTheme.typography.displaySmall,
                        fontWeight = FontWeight.Bold,
                        color = Amber700,
                    )
                    Text(
                        "${uiState.expenses.size} transactions",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }

            // ─── Category Breakdown ───────────────────────────────────────────
            if (uiState.categoryBreakdown.isNotEmpty()) {
                Column(modifier = Modifier.padding(horizontal = 24.dp, vertical = 8.dp)) {
                    Text("By Category", style = MaterialTheme.typography.labelLarge)
                    Spacer(modifier = Modifier.height(8.dp))
                    for ((category, amount) in uiState.categoryBreakdown.entries.take(4)) {
                        val ratio = if (uiState.totalAmount > 0) (amount / uiState.totalAmount).toFloat() else 0f
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 4.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Text(
                                category,
                                style = MaterialTheme.typography.bodySmall,
                                modifier = Modifier.width(80.dp),
                            )
                            LinearProgressIndicator(
                                progress = { ratio },
                                modifier = Modifier
                                    .weight(1f)
                                    .height(6.dp)
                                    .clip(MaterialTheme.shapes.extraSmall),
                                color = Amber600,
                                trackColor = MaterialTheme.colorScheme.surfaceVariant,
                            )
                            Text(
                                formatCurrency(amount),
                                style = MaterialTheme.typography.labelSmall,
                                modifier = Modifier.width(72.dp),
                                textAlign = TextAlign.End,
                            )
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            // ─── Expense List ─────────────────────────────────────────────────
            when {
                uiState.isLoading -> {
                    LazyColumn { items(5) { ShimmerListItem() } }
                }
                uiState.expenses.isEmpty() -> {
                    EmptyState(
                        icon = Icons.Outlined.AccountBalance,
                        title = "No expenses recorded",
                        subtitle = "Tap + to add your first expense",
                    )
                }
                else -> {
                    LazyColumn(
                        contentPadding = PaddingValues(horizontal = 24.dp, vertical = 4.dp),
                        verticalArrangement = Arrangement.spacedBy(6.dp),
                    ) {
                        items(uiState.expenses, key = { it.id }) { expense ->
                            ExpenseCard(
                                expense = expense,
                                onDelete = { viewModel.deleteExpense(expense.id) },
                            )
                        }
                    }
                }
            }
        }
    }

    // ─── Add Expense Bottom Sheet ─────────────────────────────────────────────
    if (showAddSheet) {
        AddExpenseSheet(
            viewModel = viewModel,
            onDismiss = { showAddSheet = false },
        )
    }
}

@Composable
private fun ExpenseCard(
    expense: ExpenseDto,
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
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(expense.category, style = MaterialTheme.typography.titleSmall)
                expense.description?.let {
                    Text(
                        it,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        maxLines = 1,
                    )
                }
                Text(
                    expense.expenseDate,
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.7f),
                )
            }
            Text(
                formatCurrency(expense.amount),
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.SemiBold,
                color = Error500,
            )
            IconButton(onClick = onDelete) {
                Icon(
                    Icons.Outlined.Delete,
                    contentDescription = "Delete",
                    tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.5f),
                )
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun AddExpenseSheet(
    viewModel: ExpensesViewModel,
    onDismiss: () -> Unit,
) {
    val formState by viewModel.formState.collectAsState()
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        shape = MaterialTheme.shapes.large,
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(24.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            Text("Add Expense", style = MaterialTheme.typography.headlineSmall)

            AppTextField(
                value = formState.category,
                onValueChange = viewModel::onCategoryFormChange,
                label = "Category",
                placeholder = "e.g., Rent, Transport, Supplies",
            )

            AppTextField(
                value = formState.amount,
                onValueChange = viewModel::onAmountFormChange,
                label = "Amount (₹)",
                keyboardOptions = KeyboardOptions(
                    keyboardType = KeyboardType.Decimal,
                ),
            )

            AppTextField(
                value = formState.description,
                onValueChange = viewModel::onDescriptionFormChange,
                label = "Description (optional)",
                singleLine = false,
            )

            Spacer(modifier = Modifier.height(8.dp))

            PrimaryButton(
                text = "Add Expense",
                onClick = {
                    viewModel.addExpense { onDismiss() }
                },
                loading = formState.isSaving,
                enabled = formState.category.isNotBlank() && formState.amount.isNotBlank(),
            )

            Spacer(modifier = Modifier.height(16.dp))
        }
    }
}
