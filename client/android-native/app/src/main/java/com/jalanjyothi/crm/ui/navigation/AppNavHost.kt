package com.jalanjyothi.crm.ui.navigation

import androidx.compose.animation.AnimatedContentTransitionScope
import androidx.compose.animation.core.EaseInOut
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.navArgument
import com.jalanjyothi.crm.ui.screens.auth.AuthState
import com.jalanjyothi.crm.ui.screens.auth.LoginScreen
import com.jalanjyothi.crm.ui.screens.auth.RegisterScreen
import com.jalanjyothi.crm.ui.screens.bills.BillFormScreen
import com.jalanjyothi.crm.ui.screens.bills.BillsScreen
import com.jalanjyothi.crm.ui.screens.customers.CustomerDetailScreen
import com.jalanjyothi.crm.ui.screens.customers.CustomersScreen
import com.jalanjyothi.crm.ui.screens.expenses.ExpensesScreen
import com.jalanjyothi.crm.ui.screens.home.HomeScreen
import com.jalanjyothi.crm.ui.screens.more.MoreScreen
import com.jalanjyothi.crm.ui.screens.profile.ProfileScreen
import com.jalanjyothi.crm.ui.screens.settings.SettingsScreen
import com.jalanjyothi.crm.ui.screens.stock.BulkUpdateScreen
import com.jalanjyothi.crm.ui.screens.stock.ItemFormScreen
import com.jalanjyothi.crm.ui.screens.stock.PurchaseFormScreen
import com.jalanjyothi.crm.ui.screens.stock.StockScreen

private const val TRANSITION_DURATION = 300

@Composable
fun AppNavHost(
    navController: NavHostController,
    authState: AuthState,
    modifier: Modifier = Modifier,
) {
    val startDestination = if (authState.isAuthenticated) Screen.Home.route else Screen.Login.route

    NavHost(
        navController = navController,
        startDestination = startDestination,
        modifier = modifier,
        enterTransition = {
            fadeIn(tween(TRANSITION_DURATION, easing = EaseInOut)) +
                slideIntoContainer(
                    AnimatedContentTransitionScope.SlideDirection.Start,
                    tween(TRANSITION_DURATION, easing = EaseInOut),
                    initialOffset = { it / 4 },
                )
        },
        exitTransition = {
            fadeOut(tween(TRANSITION_DURATION / 2))
        },
        popEnterTransition = {
            fadeIn(tween(TRANSITION_DURATION, easing = EaseInOut)) +
                slideIntoContainer(
                    AnimatedContentTransitionScope.SlideDirection.End,
                    tween(TRANSITION_DURATION, easing = EaseInOut),
                    initialOffset = { it / 4 },
                )
        },
        popExitTransition = {
            fadeOut(tween(TRANSITION_DURATION / 2))
        },
    ) {
        // ─── Auth ─────────────────────────────────────────────────────────────────
        composable(
            route = Screen.Login.route,
            enterTransition = { fadeIn(tween(400)) },
            exitTransition = { fadeOut(tween(200)) },
        ) {
            LoginScreen(
                onLoginSuccess = {
                    navController.navigate(Screen.Home.route) {
                        popUpTo(Screen.Login.route) { inclusive = true }
                    }
                },
                onNavigateToRegister = {
                    navController.navigate(Screen.Register.route)
                },
            )
        }

        composable(
            route = Screen.Register.route,
            enterTransition = { fadeIn(tween(400)) },
            exitTransition = { fadeOut(tween(200)) },
        ) {
            RegisterScreen(
                onRegisterSuccess = {
                    navController.navigate(Screen.Login.route) {
                        popUpTo(Screen.Register.route) { inclusive = true }
                    }
                },
                onNavigateToLogin = {
                    navController.popBackStack()
                },
            )
        }

        // ─── Primary Tabs (crossfade for tab switches) ────────────────────────────
        composable(
            route = Screen.Home.route,
            enterTransition = { fadeIn(tween(200)) },
            exitTransition = { fadeOut(tween(150)) },
        ) {
            HomeScreen(
                onNavigateToBillForm = { navController.navigate(Screen.BillForm.route) },
                onNavigateToBills = { navController.navigate(Screen.Bills.route) },
                onNavigateToStock = { navController.navigate(Screen.Stock.route) },
            )
        }

        composable(
            route = Screen.Bills.route,
            enterTransition = { fadeIn(tween(200)) },
            exitTransition = { fadeOut(tween(150)) },
        ) {
            BillsScreen(
                onCreateBill = { navController.navigate(Screen.BillForm.route) },
                onEditBill = { id -> navController.navigate(Screen.BillEdit.withId(id)) },
                onBillDetail = { id -> navController.navigate(Screen.BillDetail.withId(id)) },
            )
        }

        composable(
            route = Screen.Stock.route,
            enterTransition = { fadeIn(tween(200)) },
            exitTransition = { fadeOut(tween(150)) },
        ) {
            StockScreen(
                onCreateItem = { navController.navigate(Screen.ItemForm.route) },
                onEditItem = { id -> navController.navigate(Screen.ItemEdit.withId(id)) },
                onAddPurchase = { navController.navigate(Screen.PurchaseForm.route) },
                onBulkUpdate = { navController.navigate(Screen.BulkUpdate.route) },
                onNavigateToPurchases = { /* Purchases are embedded in StockScreen tabs */ },
            )
        }

        composable(
            route = Screen.More.route,
            enterTransition = { fadeIn(tween(200)) },
            exitTransition = { fadeOut(tween(150)) },
        ) {
            MoreScreen(
                onNavigateToCustomers = { navController.navigate(Screen.Customers.route) },
                onNavigateToExpenses = { navController.navigate(Screen.Expenses.route) },
                onNavigateToProfile = { navController.navigate(Screen.Profile.route) },
                onNavigateToSettings = { navController.navigate(Screen.Settings.route) },
                role = authState.role,
            )
        }

        // ─── Detail Screens ───────────────────────────────────────────────────────
        composable(route = Screen.BillForm.route) {
            BillFormScreen(onBack = { navController.popBackStack() })
        }

        composable(
            route = Screen.BillEdit.route,
            arguments = listOf(navArgument("billId") { type = NavType.IntType }),
        ) {
            BillFormScreen(
                billId = it.arguments?.getInt("billId"),
                onBack = { navController.popBackStack() },
            )
        }

        composable(route = Screen.ItemForm.route) {
            ItemFormScreen(onBack = { navController.popBackStack() })
        }

        composable(
            route = Screen.ItemEdit.route,
            arguments = listOf(navArgument("itemId") { type = NavType.IntType }),
        ) {
            ItemFormScreen(
                itemId = it.arguments?.getInt("itemId"),
                onBack = { navController.popBackStack() },
            )
        }

        composable(route = Screen.PurchaseForm.route) {
            PurchaseFormScreen(onBack = { navController.popBackStack() })
        }

        composable(route = Screen.BulkUpdate.route) {
            BulkUpdateScreen(onBack = { navController.popBackStack() })
        }

        composable(route = Screen.Customers.route) {
            CustomersScreen(
                onCustomerClick = { id -> navController.navigate(Screen.CustomerDetail.withId(id)) },
                onBack = { navController.popBackStack() },
            )
        }

        composable(
            route = Screen.CustomerDetail.route,
            arguments = listOf(navArgument("customerId") { type = NavType.IntType }),
        ) {
            CustomerDetailScreen(onBack = { navController.popBackStack() })
        }

        composable(route = Screen.Expenses.route) {
            ExpensesScreen(onBack = { navController.popBackStack() })
        }

        composable(route = Screen.Profile.route) {
            ProfileScreen(
                onBack = { navController.popBackStack() },
                onLogout = {
                    navController.navigate(Screen.Login.route) {
                        popUpTo(0) { inclusive = true }
                    }
                },
            )
        }

        composable(route = Screen.Settings.route) {
            SettingsScreen(onBack = { navController.popBackStack() })
        }
    }
}
