package com.jalanjyothi.crm

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.layout.consumeWindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.jalanjyothi.crm.AppLogger
import com.jalanjyothi.crm.ui.navigation.AppNavHost
import com.jalanjyothi.crm.ui.navigation.BottomNavBar
import com.jalanjyothi.crm.ui.navigation.Screen
import com.jalanjyothi.crm.ui.screens.auth.AuthViewModel
import com.jalanjyothi.crm.ui.theme.JJCrmTheme
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        AppLogger.i("MainActivity", "onCreate() start — savedInstanceState=${savedInstanceState != null}")
        installSplashScreen()
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        AppLogger.i("MainActivity", "edge-to-edge enabled, building Compose content")

        setContent {
            JJCrmTheme {
                val authViewModel: AuthViewModel = hiltViewModel()
                val authState by authViewModel.authState.collectAsState()
                val navController = rememberNavController()
                val navBackStackEntry by navController.currentBackStackEntryAsState()
                val currentRoute = navBackStackEntry?.destination?.route

                val showBottomBar = authState.isAuthenticated && currentRoute in listOf(
                    Screen.Home.route,
                    Screen.Bills.route,
                    Screen.Stock.route,
                    Screen.More.route,
                )

                Scaffold(
                    modifier = Modifier.fillMaxSize(),
                    bottomBar = {
                        AnimatedVisibility(
                            visible = showBottomBar,
                            enter = slideInVertically(initialOffsetY = { it }) + fadeIn(),
                            exit = slideOutVertically(targetOffsetY = { it }) + fadeOut(),
                        ) {
                            BottomNavBar(
                                navController = navController,
                                currentRoute = currentRoute,
                                role = authState.role,
                            )
                        }
                    }
                ) { innerPadding ->
                    AppNavHost(
                        navController = navController,
                        authState = authState,
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(innerPadding)
                            .consumeWindowInsets(innerPadding),
                    )
                }
            }
        }
        AppLogger.i("MainActivity", "onCreate() complete — UI composed")
    }

    override fun onResume() {
        super.onResume()
        AppLogger.d("MainActivity", "onResume()")
    }

    override fun onDestroy() {
        super.onDestroy()
        AppLogger.i("MainActivity", "onDestroy()")
    }
}
