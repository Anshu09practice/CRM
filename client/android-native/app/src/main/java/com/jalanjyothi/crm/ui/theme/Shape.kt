package com.jalanjyothi.crm.ui.theme

import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Shapes
import androidx.compose.ui.unit.dp

val AppShapes = Shapes(
    // Chips, badges, small elements
    extraSmall = RoundedCornerShape(8.dp),
    // Buttons, inputs
    small = RoundedCornerShape(12.dp),
    // Cards, containers
    medium = RoundedCornerShape(16.dp),
    // Bottom sheets, dialogs
    large = RoundedCornerShape(24.dp),
    // FAB, hero cards
    extraLarge = RoundedCornerShape(32.dp),
)
