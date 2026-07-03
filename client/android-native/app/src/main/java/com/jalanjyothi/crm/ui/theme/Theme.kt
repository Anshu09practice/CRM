package com.jalanjyothi.crm.ui.theme

import android.app.Activity
import android.os.Build
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.dynamicDarkColorScheme
import androidx.compose.material3.dynamicLightColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat

// ─── Light Color Scheme ───────────────────────────────────────────────────────
private val LightColorScheme = lightColorScheme(
    primary = Amber700,
    onPrimary = Color.White,
    primaryContainer = Amber100,
    onPrimaryContainer = Amber900,

    secondary = Teal700,
    onSecondary = Color.White,
    secondaryContainer = Teal100,
    onSecondaryContainer = Teal900,

    tertiary = Info700,
    onTertiary = Color.White,
    tertiaryContainer = Info50,
    onTertiaryContainer = Info700,

    background = Stone50,
    onBackground = Stone900,

    surface = Color.White,
    onSurface = Stone900,
    surfaceVariant = Stone100,
    onSurfaceVariant = Stone600,

    outline = Stone300,
    outlineVariant = Stone200,

    error = Error700,
    onError = Color.White,
    errorContainer = Error50,
    onErrorContainer = Error700,

    inverseSurface = Stone900,
    inverseOnSurface = Stone100,
    inversePrimary = Amber300,

    surfaceTint = Amber700,
    scrim = Color(0x52000000),
)

// ─── Dark Color Scheme ────────────────────────────────────────────────────────
private val DarkColorScheme = darkColorScheme(
    primary = Amber400,
    onPrimary = Amber900,
    primaryContainer = Amber800,
    onPrimaryContainer = Amber100,

    secondary = Teal400,
    onSecondary = Teal900,
    secondaryContainer = Teal800,
    onSecondaryContainer = Teal100,

    tertiary = Info500,
    onTertiary = Info700,
    tertiaryContainer = Info700,
    onTertiaryContainer = Info50,

    background = Stone950,
    onBackground = Stone100,

    surface = Stone900,
    onSurface = Stone100,
    surfaceVariant = Stone800,
    onSurfaceVariant = Stone400,

    outline = Stone600,
    outlineVariant = Stone700,

    error = Error500,
    onError = Color.White,
    errorContainer = Color(0xFF4A0E1A),
    onErrorContainer = Error50,

    inverseSurface = Stone100,
    inverseOnSurface = Stone900,
    inversePrimary = Amber700,

    surfaceTint = Amber400,
    scrim = Color(0x80000000),
)

@Composable
fun JJCrmTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    dynamicColor: Boolean = true,
    content: @Composable () -> Unit,
) {
    val colorScheme = when {
        // Use Material You dynamic color on Android 12+
        dynamicColor && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S -> {
            val context = LocalContext.current
            if (darkTheme) dynamicDarkColorScheme(context)
            else dynamicLightColorScheme(context)
        }
        darkTheme -> DarkColorScheme
        else -> LightColorScheme
    }

    // Edge-to-edge status bar
    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as Activity).window
            window.statusBarColor = Color.Transparent.toArgb()
            window.navigationBarColor = Color.Transparent.toArgb()
            WindowCompat.getInsetsController(window, view).apply {
                isAppearanceLightStatusBars = !darkTheme
                isAppearanceLightNavigationBars = !darkTheme
            }
        }
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = AppTypography,
        shapes = AppShapes,
        content = content,
    )
}
