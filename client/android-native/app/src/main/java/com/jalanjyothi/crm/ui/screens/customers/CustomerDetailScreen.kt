package com.jalanjyothi.crm.ui.screens.customers

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.expandVertically
import androidx.compose.animation.fadeIn
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
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowBack
import androidx.compose.material.icons.automirrored.outlined.Chat
import androidx.compose.material.icons.outlined.Call
import androidx.compose.material.icons.outlined.Receipt
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRow
import androidx.compose.material3.TabRowDefaults.SecondaryIndicator
import androidx.compose.material3.TabRowDefaults.tabIndicatorOffset
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.jalanjyothi.crm.data.remote.BillDto
import com.jalanjyothi.crm.ui.components.EmptyState
import com.jalanjyothi.crm.ui.components.ShimmerCard
import com.jalanjyothi.crm.ui.components.formatCurrency
import com.jalanjyothi.crm.ui.theme.Error500
import com.jalanjyothi.crm.ui.theme.Success500
import com.jalanjyothi.crm.ui.theme.Teal700

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CustomerDetailScreen(
    onBack: () -> Unit,
    viewModel: CustomerDetailViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsState()
    var selectedTab by remember { mutableIntStateOf(0) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(uiState.customer?.name ?: "Customer") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Outlined.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    uiState.customer?.phone?.let {
                        IconButton(onClick = { /* TODO: Intent dial */ }) {
                            Icon(Icons.Outlined.Call, contentDescription = "Call")
                        }
                        IconButton(onClick = { /* TODO: WhatsApp intent */ }) {
                            Icon(Icons.AutoMirrored.Outlined.Chat, contentDescription = "WhatsApp")
                        }
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.background,
                ),
            )
        },
    ) { innerPadding ->
        if (uiState.isLoading) {
            Column(modifier = Modifier.padding(innerPadding).padding(24.dp)) {
                ShimmerCard()
                Spacer(modifier = Modifier.height(16.dp))
                ShimmerCard()
            }
            return@Scaffold
        }

        val customer = uiState.customer ?: return@Scaffold

        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding),
        ) {
            // ─── Header Card ──────────────────────────────────────────────────
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 24.dp),
                shape = MaterialTheme.shapes.large,
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.2f),
                ),
            ) {
                Row(
                    modifier = Modifier.padding(20.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    // Avatar
                    Box(
                        modifier = Modifier
                            .size(56.dp)
                            .clip(CircleShape)
                            .background(Teal700.copy(alpha = 0.15f)),
                        contentAlignment = Alignment.Center,
                    ) {
                        Text(
                            text = customer.name.take(2).uppercase(),
                            style = MaterialTheme.typography.titleLarge,
                            color = Teal700,
                            fontWeight = FontWeight.Bold,
                        )
                    }

                    Spacer(modifier = Modifier.width(16.dp))

                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = customer.name,
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.SemiBold,
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

                // Stats row
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 20.dp)
                        .padding(bottom = 20.dp),
                    horizontalArrangement = Arrangement.SpaceEvenly,
                ) {
                    StatItem(
                        label = "Total Spent",
                        value = formatCurrency(customer.totalSpent ?: 0.0),
                        color = MaterialTheme.colorScheme.onSurface,
                    )
                    StatItem(
                        label = "Credit Due",
                        value = formatCurrency(customer.creditBalance),
                        color = if (customer.creditBalance > 0) Error500
                        else Success500,
                    )
                    StatItem(
                        label = "Bills",
                        value = "${customer.bills?.size ?: 0}",
                        color = MaterialTheme.colorScheme.onSurface,
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // ─── Tabs ─────────────────────────────────────────────────────────
            TabRow(
                selectedTabIndex = selectedTab,
                containerColor = MaterialTheme.colorScheme.background,
                indicator = { tabPositions ->
                    SecondaryIndicator(
                        modifier = Modifier.tabIndicatorOffset(tabPositions[selectedTab]),
                        color = MaterialTheme.colorScheme.primary,
                    )
                },
            ) {
                Tab(selected = selectedTab == 0, onClick = { selectedTab = 0 }) {
                    Text("Bills", modifier = Modifier.padding(vertical = 16.dp))
                }
                Tab(selected = selectedTab == 1, onClick = { selectedTab = 1 }) {
                    Text("Notes", modifier = Modifier.padding(vertical = 16.dp))
                }
            }

            // ─── Tab Content ──────────────────────────────────────────────────
            when (selectedTab) {
                0 -> {
                    val bills = customer.bills ?: emptyList()
                    if (bills.isEmpty()) {
                        EmptyState(
                            icon = Icons.Outlined.Receipt,
                            title = "No bills yet",
                            subtitle = "Bills for this customer will appear here",
                        )
                    } else {
                        LazyColumn(
                            contentPadding = PaddingValues(horizontal = 24.dp, vertical = 12.dp),
                            verticalArrangement = Arrangement.spacedBy(8.dp),
                        ) {
                            items(bills, key = { it.id }) { bill ->
                                CustomerBillCard(bill = bill)
                            }
                        }
                    }
                }
                1 -> {
                    Column(modifier = Modifier.padding(24.dp)) {
                        Text(
                            text = customer.notes ?: "No notes",
                            style = MaterialTheme.typography.bodyMedium,
                            color = if (customer.notes != null) MaterialTheme.colorScheme.onSurface
                            else MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.5f),
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun StatItem(label: String, value: String, color: androidx.compose.ui.graphics.Color) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(
            text = value,
            style = MaterialTheme.typography.titleSmall,
            color = color,
            fontWeight = FontWeight.SemiBold,
        )
        Text(
            text = label,
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

@Composable
private fun CustomerBillCard(bill: BillDto) {
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
                Text("#${bill.billNumber}", style = MaterialTheme.typography.titleSmall)
                Text(
                    bill.billDate,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            Column(horizontalAlignment = Alignment.End) {
                Text(
                    formatCurrency(bill.total),
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.SemiBold,
                )
                val statusColor = when (bill.paymentStatus) {
                    "paid" -> Success500
                    "partial" -> com.jalanjyothi.crm.ui.theme.Warning500
                    else -> Error500
                }
                Text(
                    bill.paymentStatus.replaceFirstChar { it.uppercase() },
                    style = MaterialTheme.typography.labelSmall,
                    color = statusColor,
                )
            }
        }
    }
}
