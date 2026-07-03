package com.jalanjyothi.crm.ui.screens.home

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.spring
import androidx.compose.animation.fadeIn
import androidx.compose.animation.scaleIn
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
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Add
import androidx.compose.material.icons.outlined.Inventory2
import androidx.compose.material.icons.outlined.Payments
import androidx.compose.material.icons.outlined.Receipt
import androidx.compose.material.icons.outlined.TrendingDown
import androidx.compose.material.icons.outlined.TrendingUp
import androidx.compose.material.icons.outlined.Warning
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.jalanjyothi.crm.ui.components.EmptyState
import com.jalanjyothi.crm.ui.components.ShimmerBox
import com.jalanjyothi.crm.ui.components.ShimmerCard
import com.jalanjyothi.crm.ui.components.formatCompact
import com.jalanjyothi.crm.ui.components.formatCurrency
import com.jalanjyothi.crm.ui.theme.Amber600
import com.jalanjyothi.crm.ui.theme.Amber700
import com.jalanjyothi.crm.ui.theme.Error500
import com.jalanjyothi.crm.ui.theme.Success500
import com.jalanjyothi.crm.ui.theme.Teal600

@Composable
fun HomeScreen(
    onNavigateToBillForm: () -> Unit,
    onNavigateToBills: () -> Unit,
    onNavigateToStock: () -> Unit,
    viewModel: HomeViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsState()

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(bottom = 24.dp),
    ) {
        // ─── Greeting Header ──────────────────────────────────────────────────
        item {
            Column(
                modifier = Modifier.padding(horizontal = 24.dp, vertical = 16.dp),
            ) {
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = "${uiState.greeting},",
                    style = MaterialTheme.typography.bodyLarge,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Text(
                    text = uiState.username.replaceFirstChar { it.uppercase() },
                    style = MaterialTheme.typography.displaySmall,
                    color = MaterialTheme.colorScheme.onBackground,
                )
            }
        }

        // ─── Revenue Hero Card ────────────────────────────────────────────────
        item {
            if (uiState.isLoading) {
                ShimmerCard(modifier = Modifier.padding(horizontal = 24.dp))
            } else {
                RevenueCard(
                    todayRevenue = uiState.summary?.today?.revenue ?: 0.0,
                    todaySalesCount = uiState.summary?.today?.salesCount ?: 0,
                    monthlyRevenue = uiState.summary?.monthly?.revenue ?: 0.0,
                    prevMonthRevenue = uiState.summary?.monthly?.prevMonthRevenue ?: 0.0,
                    modifier = Modifier.padding(horizontal = 24.dp),
                )
            }
        }

        // ─── Quick Actions ────────────────────────────────────────────────────
        item {
            Spacer(modifier = Modifier.height(24.dp))
            QuickActionsRow(
                onNewBill = onNavigateToBillForm,
                onCollectPayment = onNavigateToBills,
                onAddStock = onNavigateToStock,
            )
        }

        // ─── Insights Row ─────────────────────────────────────────────────────
        item {
            Spacer(modifier = Modifier.height(24.dp))
            if (uiState.isLoading) {
                Row(
                    modifier = Modifier.padding(horizontal = 24.dp),
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    ShimmerCard(modifier = Modifier.weight(1f))
                    ShimmerCard(modifier = Modifier.weight(1f))
                }
            } else {
                InsightsRow(
                    profit = uiState.summary?.monthly?.profit ?: 0.0,
                    pendingAmount = uiState.summary?.pendingPayments?.amount ?: 0.0,
                    pendingCount = uiState.summary?.pendingPayments?.count ?: 0,
                    modifier = Modifier.padding(horizontal = 24.dp),
                )
            }
        }

        // ─── Low Stock Alerts ─────────────────────────────────────────────────
        if (!uiState.isLoading && uiState.lowStockItems.isNotEmpty()) {
            item {
                Spacer(modifier = Modifier.height(24.dp))
                SectionHeader(
                    title = "Low Stock",
                    badge = "${uiState.lowStockItems.size}",
                    modifier = Modifier.padding(horizontal = 24.dp),
                )
                Spacer(modifier = Modifier.height(8.dp))
            }

            items(
                items = uiState.lowStockItems.take(5),
                key = { it.id },
            ) { item ->
                LowStockItem(
                    name = item.itemName,
                    currentStock = item.currentStock,
                    threshold = item.lowStockThreshold,
                    modifier = Modifier.padding(horizontal = 24.dp, vertical = 4.dp),
                )
            }
        }
    }
}

// ─── Revenue Card ─────────────────────────────────────────────────────────────

@Composable
private fun RevenueCard(
    todayRevenue: Double,
    todaySalesCount: Int,
    monthlyRevenue: Double,
    prevMonthRevenue: Double,
    modifier: Modifier = Modifier,
) {
    val growthPercent = if (prevMonthRevenue > 0) {
        ((monthlyRevenue - prevMonthRevenue) / prevMonthRevenue * 100).toInt()
    } else 0

    Card(
        modifier = modifier.fillMaxWidth(),
        shape = MaterialTheme.shapes.large,
        colors = CardDefaults.cardColors(
            containerColor = Color.Transparent,
        ),
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .background(
                    brush = Brush.linearGradient(
                        colors = listOf(Amber700, Amber600),
                    ),
                    shape = MaterialTheme.shapes.large,
                )
                .padding(24.dp),
        ) {
            Column {
                Text(
                    text = "Today's Revenue",
                    style = MaterialTheme.typography.bodyMedium,
                    color = Color.White.copy(alpha = 0.8f),
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = formatCurrency(todayRevenue),
                    style = MaterialTheme.typography.displayMedium,
                    color = Color.White,
                    fontWeight = FontWeight.Bold,
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = "$todaySalesCount sales today",
                    style = MaterialTheme.typography.bodySmall,
                    color = Color.White.copy(alpha = 0.7f),
                )

                Spacer(modifier = Modifier.height(16.dp))

                // Monthly growth indicator
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = if (growthPercent >= 0) Icons.Outlined.TrendingUp
                        else Icons.Outlined.TrendingDown,
                        contentDescription = null,
                        modifier = Modifier.size(16.dp),
                        tint = Color.White.copy(alpha = 0.9f),
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = "${if (growthPercent >= 0) "+" else ""}$growthPercent% this month",
                        style = MaterialTheme.typography.labelMedium,
                        color = Color.White.copy(alpha = 0.9f),
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "· ${formatCompact(monthlyRevenue)} total",
                        style = MaterialTheme.typography.labelMedium,
                        color = Color.White.copy(alpha = 0.7f),
                    )
                }
            }
        }
    }
}

// ─── Quick Actions ────────────────────────────────────────────────────────────

@Composable
private fun QuickActionsRow(
    onNewBill: () -> Unit,
    onCollectPayment: () -> Unit,
    onAddStock: () -> Unit,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 24.dp),
        horizontalArrangement = Arrangement.SpaceEvenly,
    ) {
        QuickActionButton(
            icon = Icons.Outlined.Receipt,
            label = "New Bill",
            color = Amber700,
            onClick = onNewBill,
        )
        QuickActionButton(
            icon = Icons.Outlined.Payments,
            label = "Collect",
            color = Teal600,
            onClick = onCollectPayment,
        )
        QuickActionButton(
            icon = Icons.Outlined.Add,
            label = "Add Stock",
            color = MaterialTheme.colorScheme.tertiary,
            onClick = onAddStock,
        )
    }
}

@Composable
private fun QuickActionButton(
    icon: ImageVector,
    label: String,
    color: Color,
    onClick: () -> Unit,
) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier.clickable(onClick = onClick),
    ) {
        Surface(
            modifier = Modifier.size(56.dp),
            shape = CircleShape,
            color = color.copy(alpha = 0.1f),
        ) {
            Box(contentAlignment = Alignment.Center) {
                Icon(
                    imageVector = icon,
                    contentDescription = label,
                    modifier = Modifier.size(24.dp),
                    tint = color,
                )
            }
        }
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            text = label,
            style = MaterialTheme.typography.labelMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

// ─── Insights Row ─────────────────────────────────────────────────────────────

@Composable
private fun InsightsRow(
    profit: Double,
    pendingAmount: Double,
    pendingCount: Int,
    modifier: Modifier = Modifier,
) {
    Row(
        modifier = modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        InsightCard(
            title = "Monthly Profit",
            value = formatCurrency(profit),
            subtitle = if (profit >= 0) "On track" else "Below target",
            valueColor = if (profit >= 0) Success500 else Error500,
            modifier = Modifier.weight(1f),
        )
        InsightCard(
            title = "Pending",
            value = formatCurrency(pendingAmount),
            subtitle = "$pendingCount bills due",
            valueColor = if (pendingCount > 0) Error500 else Success500,
            modifier = Modifier.weight(1f),
        )
    }
}

@Composable
private fun InsightCard(
    title: String,
    value: String,
    subtitle: String,
    valueColor: Color,
    modifier: Modifier = Modifier,
) {
    Card(
        modifier = modifier,
        shape = MaterialTheme.shapes.medium,
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface,
        ),
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(
                text = title,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = value,
                style = MaterialTheme.typography.titleLarge,
                color = valueColor,
                fontWeight = FontWeight.SemiBold,
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = subtitle,
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.7f),
            )
        }
    }
}

// ─── Section Header ───────────────────────────────────────────────────────────

@Composable
private fun SectionHeader(
    title: String,
    badge: String? = null,
    modifier: Modifier = Modifier,
) {
    Row(
        modifier = modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            text = title,
            style = MaterialTheme.typography.titleMedium,
            color = MaterialTheme.colorScheme.onBackground,
        )
        badge?.let {
            Spacer(modifier = Modifier.width(8.dp))
            Surface(
                shape = CircleShape,
                color = Error500.copy(alpha = 0.1f),
            ) {
                Text(
                    text = it,
                    style = MaterialTheme.typography.labelSmall,
                    color = Error500,
                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp),
                )
            }
        }
    }
}

// ─── Low Stock Item ───────────────────────────────────────────────────────────

@Composable
private fun LowStockItem(
    name: String,
    currentStock: Int,
    threshold: Int,
    modifier: Modifier = Modifier,
) {
    Card(
        modifier = modifier.fillMaxWidth(),
        shape = MaterialTheme.shapes.small,
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.errorContainer.copy(alpha = 0.3f),
        ),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(
                imageVector = Icons.Outlined.Warning,
                contentDescription = null,
                modifier = Modifier.size(18.dp),
                tint = MaterialTheme.colorScheme.error,
            )
            Spacer(modifier = Modifier.width(12.dp))
            Text(
                text = name,
                style = MaterialTheme.typography.bodyMedium,
                modifier = Modifier.weight(1f),
                color = MaterialTheme.colorScheme.onBackground,
            )
            Text(
                text = "$currentStock left",
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.error,
                fontWeight = FontWeight.SemiBold,
            )
        }
    }
}
