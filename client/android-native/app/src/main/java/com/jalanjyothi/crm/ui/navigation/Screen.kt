package com.jalanjyothi.crm.ui.navigation

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material.icons.outlined.Inventory2
import androidx.compose.material.icons.outlined.MoreHoriz
import androidx.compose.material.icons.outlined.Receipt
import androidx.compose.material.icons.rounded.Home
import androidx.compose.material.icons.rounded.Inventory2
import androidx.compose.material.icons.rounded.MoreHoriz
import androidx.compose.material.icons.rounded.Receipt
import androidx.compose.ui.graphics.vector.ImageVector

sealed class Screen(val route: String) {
    // Auth
    data object Login : Screen("login")
    data object Register : Screen("register")
    data object Setup : Screen("setup")

    // Primary tabs
    data object Home : Screen("home")
    data object Bills : Screen("bills")
    data object Stock : Screen("stock")
    data object More : Screen("more")

    // Detail screens
    data object BillForm : Screen("bill/create")
    data object BillEdit : Screen("bill/{billId}/edit") {
        fun withId(id: Int) = "bill/$id/edit"
    }
    data object BillDetail : Screen("bill/{billId}") {
        fun withId(id: Int) = "bill/$id"
    }
    data object ItemForm : Screen("item/create")
    data object ItemEdit : Screen("item/{itemId}/edit") {
        fun withId(id: Int) = "item/$id/edit"
    }
    data object PurchaseForm : Screen("purchase/create")
    data object BulkUpdate : Screen("inventory/bulk-update")
    data object CustomerDetail : Screen("customer/{customerId}") {
        fun withId(id: Int) = "customer/$id"
    }
    data object Customers : Screen("customers")
    data object Expenses : Screen("expenses")
    data object Purchases : Screen("purchases")
    data object Profile : Screen("profile")
    data object Settings : Screen("settings")
}

data class BottomNavItem(
    val screen: Screen,
    val label: String,
    val selectedIcon: ImageVector,
    val unselectedIcon: ImageVector,
)

val bottomNavItems = listOf(
    BottomNavItem(
        screen = Screen.Home,
        label = "Home",
        selectedIcon = Icons.Rounded.Home,
        unselectedIcon = Icons.Outlined.Home,
    ),
    BottomNavItem(
        screen = Screen.Bills,
        label = "Bills",
        selectedIcon = Icons.Rounded.Receipt,
        unselectedIcon = Icons.Outlined.Receipt,
    ),
    BottomNavItem(
        screen = Screen.Stock,
        label = "Stock",
        selectedIcon = Icons.Rounded.Inventory2,
        unselectedIcon = Icons.Outlined.Inventory2,
    ),
    BottomNavItem(
        screen = Screen.More,
        label = "More",
        selectedIcon = Icons.Rounded.MoreHoriz,
        unselectedIcon = Icons.Outlined.MoreHoriz,
    ),
)

/**
 * Returns filtered bottom nav items based on user role:
 * - owner: All tabs
 * - manager: Home, Bills, Stock, More
 * - employee: Home, Bills only
 */
fun getBottomNavItemsForRole(role: String?): List<BottomNavItem> {
    return when (role) {
        "employee" -> bottomNavItems.filter { it.screen in listOf(Screen.Home, Screen.Bills) }
        "manager" -> bottomNavItems // Manager gets all tabs but limited access within
        else -> bottomNavItems // Owner gets everything
    }
}
