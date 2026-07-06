package com.jalanjyothi.crm.ui.screens.customers

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
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowBack
import androidx.compose.material.icons.outlined.Groups
import androidx.compose.material.icons.outlined.Search
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
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
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.jalanjyothi.crm.data.remote.CustomerDto
import com.jalanjyothi.crm.ui.components.AppTextField
import com.jalanjyothi.crm.ui.components.EmptyState
import com.jalanjyothi.crm.ui.components.ShimmerListItem
import com.jalanjyothi.crm.ui.components.formatCurrency
import com.jalanjyothi.crm.ui.theme.Error500
import com.jalanjyothi.crm.ui.theme.Teal700

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CustomersScreen(
    onCustomerClick: (Int) -> Unit,
    onBack: () -> Unit,
    viewModel: CustomersViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsState()

    Column(modifier = Modifier.fillMaxSize()) {
        TopAppBar(
            title = { Text("Customers") },
            navigationIcon = {
                IconButton(onClick = onBack) {
                    Icon(Icons.AutoMirrored.Outlined.ArrowBack, contentDescription = "Back")
                }
            },
            colors = TopAppBarDefaults.topAppBarColors(
                containerColor = MaterialTheme.colorScheme.background,
            ),
        )

        AppTextField(
            value = uiState.searchQuery,
            onValueChange = viewModel::onSearchChange,
            placeholder = "Search by name or phone",
            leadingIcon = Icons.Outlined.Search,
            modifier = Modifier.padding(horizontal = 24.dp),
        )

        Spacer(modifier = Modifier.height(12.dp))

        when {
            uiState.isLoading -> {
                LazyColumn {
                    items(6) { ShimmerListItem() }
                }
            }
            uiState.customers.isEmpty() -> {
                EmptyState(
                    icon = Icons.Outlined.Groups,
                    title = "No customers yet",
                    subtitle = "Customers are created automatically from bills",
                )
            }
            else -> {
                LazyColumn(
                    contentPadding = PaddingValues(horizontal = 24.dp),
                    verticalArrangement = Arrangement.spacedBy(4.dp),
                ) {
                    items(
                        items = uiState.customers,
                        key = { it.id },
                    ) { customer ->
                        CustomerCard(
                            customer = customer,
                            onClick = { onCustomerClick(customer.id) },
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun CustomerCard(
    customer: CustomerDto,
    onClick: () -> Unit,
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
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
            // Avatar
            val initials = customer.name.take(2).uppercase()
            Box(
                modifier = Modifier
                    .size(44.dp)
                    .clip(CircleShape)
                    .background(Teal700.copy(alpha = 0.1f)),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    text = initials,
                    style = MaterialTheme.typography.labelLarge,
                    color = Teal700,
                )
            }

            Spacer(modifier = Modifier.width(12.dp))

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = customer.name,
                    style = MaterialTheme.typography.titleSmall,
                )
                customer.phone?.let {
                    Text(
                        text = it,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }

            if (customer.creditBalance > 0) {
                Text(
                    text = formatCurrency(customer.creditBalance),
                    style = MaterialTheme.typography.labelMedium,
                    color = Error500,
                    fontWeight = FontWeight.SemiBold,
                )
            }
        }
    }
}
