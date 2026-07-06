package com.jalanjyothi.crm.ui.screens.settings

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowBack
import androidx.compose.material.icons.outlined.Category
import androidx.compose.material.icons.outlined.CheckCircle
import androidx.compose.material.icons.outlined.Delete
import androidx.compose.material.icons.outlined.Dns
import androidx.compose.material.icons.outlined.PersonAdd
import androidx.compose.material.icons.outlined.PhoneAndroid
import androidx.compose.material.icons.outlined.Wifi
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
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
import androidx.compose.ui.platform.LocalSoftwareKeyboardController
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.jalanjyothi.crm.ui.components.EmptyState
import com.jalanjyothi.crm.ui.theme.Error500
import com.jalanjyothi.crm.ui.theme.Success500

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(
    onBack: () -> Unit,
    viewModel: SettingsViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsState()
    var selectedTab by remember { mutableIntStateOf(0) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Settings") },
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
                .padding(innerPadding),
        ) {
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
                    Text("Users", modifier = Modifier.padding(vertical = 16.dp))
                }
                Tab(selected = selectedTab == 1, onClick = { selectedTab = 1 }) {
                    Text("Categories", modifier = Modifier.padding(vertical = 16.dp))
                }
                Tab(selected = selectedTab == 2, onClick = { selectedTab = 2 }) {
                    Text("Connection", modifier = Modifier.padding(vertical = 16.dp))
                }
            }

            when (selectedTab) {
                0 -> UsersTab(uiState)
                1 -> CategoriesTab(uiState, viewModel)
                2 -> ConnectionTab(uiState, viewModel)
            }
        }
    }
}

@Composable
private fun UsersTab(uiState: SettingsUiState) {
    if (uiState.users.isEmpty()) {
        EmptyState(
            icon = Icons.Outlined.PersonAdd,
            title = "No other users",
            subtitle = "You can add team members here",
        )
    } else {
        LazyColumn(
            contentPadding = androidx.compose.foundation.layout.PaddingValues(24.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            items(uiState.users) { user ->
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = MaterialTheme.shapes.medium,
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(user.username, style = MaterialTheme.typography.titleSmall)
                            Text(
                                user.role.replaceFirstChar { it.uppercase() },
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                        Text(
                            if (user.isActive) "Active" else "Inactive",
                            style = MaterialTheme.typography.labelSmall,
                            color = if (user.isActive) Success500 else Error500,
                            fontWeight = FontWeight.SemiBold,
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun CategoriesTab(uiState: SettingsUiState, viewModel: SettingsViewModel) {
    if (uiState.categories.isEmpty()) {
        EmptyState(
            icon = Icons.Outlined.Category,
            title = "No categories",
            subtitle = "Add categories to organize your inventory",
        )
    } else {
        LazyColumn(
            contentPadding = androidx.compose.foundation.layout.PaddingValues(24.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            items(uiState.categories) { category ->
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = MaterialTheme.shapes.medium,
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Text(
                            category.name,
                            style = MaterialTheme.typography.titleSmall,
                            modifier = Modifier.weight(1f),
                        )
                        IconButton(
                            onClick = { viewModel.deleteCategory(category.id) },
                            modifier = Modifier.size(32.dp),
                        ) {
                            Icon(
                                Icons.Outlined.Delete,
                                contentDescription = "Delete",
                                tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.5f),
                                modifier = Modifier.size(18.dp),
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun ConnectionTab(uiState: SettingsUiState, viewModel: SettingsViewModel) {
    val keyboard = LocalSoftwareKeyboardController.current

    LazyColumn(
        contentPadding = androidx.compose.foundation.layout.PaddingValues(24.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
        modifier = Modifier.fillMaxSize(),
    ) {
        item {
            Text(
                "Server URL",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold,
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                "Set the address of the CRM server. Use the emulator preset when testing in Android Studio, or the device preset when using your phone on WiFi.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }

        item {
            OutlinedTextField(
                value = uiState.serverUrl,
                onValueChange = viewModel::onServerUrlChange,
                label = { Text("Server URL") },
                placeholder = { Text("https://192.168.x.x:3001") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                keyboardOptions = KeyboardOptions(
                    keyboardType = KeyboardType.Uri,
                    imeAction = ImeAction.Done,
                ),
                keyboardActions = KeyboardActions(onDone = {
                    keyboard?.hide()
                    viewModel.saveServerUrl()
                }),
                leadingIcon = { Icon(Icons.Outlined.Dns, contentDescription = null) },
                trailingIcon = {
                    if (uiState.serverUrlSaved) {
                        Icon(
                            Icons.Outlined.CheckCircle,
                            contentDescription = "Saved",
                            tint = Success500,
                        )
                    }
                },
            )
        }

        item {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedButton(
                    onClick = {
                        viewModel.setEmulatorUrl()
                    },
                    modifier = Modifier.weight(1f),
                ) {
                    Icon(
                        Icons.Outlined.PhoneAndroid,
                        contentDescription = null,
                        modifier = Modifier.size(16.dp),
                    )
                    Spacer(modifier = Modifier.size(ButtonDefaults.IconSpacing))
                    Text("Emulator", style = MaterialTheme.typography.labelMedium)
                }
                OutlinedButton(
                    onClick = {
                        viewModel.setDeviceUrl()
                    },
                    modifier = Modifier.weight(1f),
                ) {
                    Icon(
                        Icons.Outlined.Wifi,
                        contentDescription = null,
                        modifier = Modifier.size(16.dp),
                    )
                    Spacer(modifier = Modifier.size(ButtonDefaults.IconSpacing))
                    Text("WiFi Device", style = MaterialTheme.typography.labelMedium)
                }
            }
        }

        item {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Button(
                    onClick = {
                        keyboard?.hide()
                        viewModel.saveServerUrl()
                    },
                    modifier = Modifier.weight(1f),
                ) {
                    Text("Save")
                }
                OutlinedButton(
                    onClick = viewModel::testConnection,
                    enabled = !uiState.isTestingConnection,
                    modifier = Modifier.weight(1f),
                ) {
                    if (uiState.isTestingConnection) {
                        CircularProgressIndicator(modifier = Modifier.size(16.dp), strokeWidth = 2.dp)
                        Spacer(modifier = Modifier.size(ButtonDefaults.IconSpacing))
                    }
                    Text("Test")
                }
            }
        }

        if (uiState.connectionTestResult != null) {
            item {
                val isSuccess = uiState.connectionTestResult.startsWith("Connected")
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = MaterialTheme.shapes.medium,
                    colors = CardDefaults.cardColors(
                        containerColor = if (isSuccess)
                            Success500.copy(alpha = 0.12f)
                        else
                            Error500.copy(alpha = 0.12f),
                    ),
                ) {
                    Text(
                        uiState.connectionTestResult,
                        modifier = Modifier.padding(16.dp),
                        style = MaterialTheme.typography.bodySmall,
                        color = if (isSuccess) Success500 else Error500,
                    )
                }
            }
        }

        item {
            Spacer(modifier = Modifier.height(8.dp))
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = MaterialTheme.shapes.medium,
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.surfaceVariant,
                ),
            ) {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text("Quick Reference", style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.SemiBold)
                    Text(
                        "Emulator: https://10.0.2.2:3001\nPhone (WiFi): https://<your-PC-IP>:3001\n\nFind your PC's IP with: ipconfig (Windows). Make sure your PC and phone are on the same WiFi network, and the Windows Firewall allows port 3001.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
        }
    }
}
