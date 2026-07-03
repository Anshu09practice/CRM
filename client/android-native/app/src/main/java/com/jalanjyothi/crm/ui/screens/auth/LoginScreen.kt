package com.jalanjyothi.crm.ui.screens.auth

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.spring
import androidx.compose.animation.expandVertically
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.shrinkVertically
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.systemBarsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Dns
import androidx.compose.material.icons.outlined.Edit
import androidx.compose.material.icons.outlined.Lock
import androidx.compose.material.icons.outlined.Person
import androidx.compose.material.icons.outlined.Visibility
import androidx.compose.material.icons.outlined.VisibilityOff
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
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
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.jalanjyothi.crm.ui.components.AppTextField
import com.jalanjyothi.crm.ui.components.PrimaryButton

@Composable
fun LoginScreen(
    onLoginSuccess: () -> Unit,
    onNavigateToRegister: () -> Unit = {},
    viewModel: LoginViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsState()
    val focusManager = LocalFocusManager.current
    val passwordFocusRequester = remember { FocusRequester() }
    var passwordVisible by remember { mutableStateOf(false) }

    Surface(
        modifier = Modifier.fillMaxSize(),
        color = MaterialTheme.colorScheme.background,
    ) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .systemBarsPadding()
                .imePadding(),
        ) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .verticalScroll(rememberScrollState())
                    .padding(horizontal = 32.dp),
                verticalArrangement = Arrangement.Center,
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Spacer(modifier = Modifier.height(80.dp))

                // ─── Brand Mark ───────────────────────────────────────────────────
                Text(
                    text = "JJ",
                    style = MaterialTheme.typography.displayLarge,
                    color = MaterialTheme.colorScheme.primary,
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = "Jalan Jyothi",
                    style = MaterialTheme.typography.titleMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )

                Spacer(modifier = Modifier.height(64.dp))

                // ─── Welcome Text ─────────────────────────────────────────────────
                Text(
                    text = "Welcome back",
                    style = MaterialTheme.typography.headlineLarge,
                    color = MaterialTheme.colorScheme.onBackground,
                )
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = if (uiState.otpSent) "Enter the OTP sent to WhatsApp"
                    else "Sign in to continue",
                    style = MaterialTheme.typography.bodyLarge,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )

                Spacer(modifier = Modifier.height(40.dp))

                // ─── Server URL (compact indicator or expanded field) ──────────────
                // Compact row — shown when URL is already configured and not editing
                AnimatedVisibility(
                    visible = uiState.serverUrl.isNotBlank() && !uiState.serverUrlExpanded,
                    enter = expandVertically() + fadeIn(),
                    exit = shrinkVertically() + fadeOut(),
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable(enabled = !uiState.showPasswordField) {
                                viewModel.onToggleServerUrl()
                            }
                            .padding(vertical = 8.dp, horizontal = 4.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            modifier = Modifier.weight(1f),
                        ) {
                            androidx.compose.material3.Icon(
                                imageVector = Icons.Outlined.Dns,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                            Text(
                                text = uiState.serverUrl
                                    .removePrefix("https://")
                                    .removePrefix("http://"),
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis,
                            )
                        }
                        if (!uiState.showPasswordField) {
                            androidx.compose.material3.Icon(
                                imageVector = Icons.Outlined.Edit,
                                contentDescription = "Change server URL",
                                tint = MaterialTheme.colorScheme.primary,
                            )
                        }
                    }
                }

                // Expanded URL field — shown when URL is blank or being edited
                AnimatedVisibility(
                    visible = uiState.serverUrl.isBlank() || uiState.serverUrlExpanded,
                    enter = expandVertically(
                        animationSpec = spring(
                            dampingRatio = Spring.DampingRatioLowBouncy,
                            stiffness = Spring.StiffnessMediumLow,
                        ),
                    ) + fadeIn(),
                    exit = shrinkVertically() + fadeOut(),
                ) {
                    AppTextField(
                        value = uiState.serverUrl,
                        onValueChange = viewModel::onServerUrlChange,
                        label = "Server URL",
                        placeholder = "https://your-server.com:3001",
                        leadingIcon = Icons.Outlined.Dns,
                        enabled = !uiState.showPasswordField,
                        keyboardOptions = KeyboardOptions(
                            keyboardType = KeyboardType.Uri,
                            imeAction = ImeAction.Next,
                        ),
                        error = if (uiState.serverUrl.isBlank()) uiState.error else null,
                    )
                }

                Spacer(modifier = Modifier.height(16.dp))

                // ─── Username Field ───────────────────────────────────────────────────────────────────────────────────────────────────
                AppTextField(
                    value = uiState.username,
                    onValueChange = viewModel::onUsernameChange,
                    label = "Username",
                    leadingIcon = Icons.Outlined.Person,
                    enabled = !uiState.showPasswordField,
                    keyboardOptions = KeyboardOptions(
                        keyboardType = KeyboardType.Text,
                        imeAction = if (uiState.showPasswordField) ImeAction.Next else ImeAction.Go,
                    ),
                    keyboardActions = KeyboardActions(
                        onGo = { viewModel.onContinue(onLoginSuccess) },
                        onNext = { passwordFocusRequester.requestFocus() },
                    ),
                    error = if (!uiState.showPasswordField) uiState.error else null,
                )

                // ─── Password Field (Progressive Disclosure) ──────────────────────
                AnimatedVisibility(
                    visible = uiState.showPasswordField,
                    enter = expandVertically(
                        animationSpec = spring(
                            dampingRatio = Spring.DampingRatioLowBouncy,
                            stiffness = Spring.StiffnessMediumLow,
                        ),
                    ) + fadeIn(),
                    exit = shrinkVertically() + fadeOut(),
                ) {
                    Column {
                        Spacer(modifier = Modifier.height(16.dp))
                        AppTextField(
                            value = uiState.password,
                            onValueChange = viewModel::onPasswordChange,
                            modifier = Modifier.focusRequester(passwordFocusRequester),
                            label = if (uiState.otpSent) "OTP" else "Password",
                            leadingIcon = Icons.Outlined.Lock,
                            trailingIcon = if (passwordVisible) Icons.Outlined.VisibilityOff
                            else Icons.Outlined.Visibility,
                            onTrailingIconClick = { passwordVisible = !passwordVisible },
                            visualTransformation = if (passwordVisible) VisualTransformation.None
                            else PasswordVisualTransformation(),
                            keyboardOptions = KeyboardOptions(
                                keyboardType = if (uiState.otpSent) KeyboardType.Number
                                else KeyboardType.Password,
                                imeAction = ImeAction.Go,
                            ),
                            keyboardActions = KeyboardActions(
                                onGo = {
                                    focusManager.clearFocus()
                                    viewModel.onContinue(onLoginSuccess)
                                },
                            ),
                            error = if (uiState.showPasswordField) uiState.error else null,
                        )
                    }
                }

                Spacer(modifier = Modifier.height(32.dp))

                // ─── Primary Action ───────────────────────────────────────────────
                PrimaryButton(
                    text = when {
                        uiState.otpSent -> "Verify OTP"
                        uiState.showPasswordField -> "Sign In"
                        else -> "Continue"
                    },
                    onClick = { viewModel.onContinue(onLoginSuccess) },
                    loading = uiState.isLoading,
                )

                // ─── Back to Username ─────────────────────────────────────────────
                AnimatedVisibility(visible = uiState.showPasswordField) {
                    TextButton(
                        onClick = viewModel::onBackToUsername,
                        modifier = Modifier.padding(top = 12.dp),
                    ) {
                        Text(
                            text = "Use a different account",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.primary,
                        )
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                // ─── Create Account ───────────────────────────────────────────────
                TextButton(
                    onClick = onNavigateToRegister,
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Text(
                        text = "Create Account",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.primary,
                    )
                }

                Spacer(modifier = Modifier.weight(1f))

                // ─── Footer ───────────────────────────────────────────────────────
                Text(
                    text = "Jalan Jyothi CRM",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.5f),
                    textAlign = TextAlign.Center,
                    modifier = Modifier.padding(bottom = 24.dp),
                )
            }
        }
    }
}
