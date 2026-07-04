package com.jalanjyothi.crm

import android.app.Application
import androidx.hilt.work.HiltWorkerFactory
import androidx.work.Configuration
import com.jalanjyothi.crm.data.sync.SyncWorker
import dagger.hilt.android.HiltAndroidApp
import javax.inject.Inject

@HiltAndroidApp
class CrmApplication : Application(), Configuration.Provider {

    @Inject
    lateinit var workerFactory: HiltWorkerFactory

    override val workManagerConfiguration: Configuration
        get() {
            AppLogger.d("App", "WorkManager requesting HiltWorkerFactory — workerFactory injected=${::workerFactory.isInitialized}")
            return Configuration.Builder()
                .setWorkerFactory(workerFactory)
                .build()
        }

    override fun onCreate() {
        super.onCreate()

        // ── 1. Boot logger first so every subsequent log goes to file ────────
        AppLogger.init(this)
        AppLogger.i("App", "CrmApplication.onCreate() start")

        // ── 2. Install global crash handler ──────────────────────────────────
        val defaultHandler = Thread.getDefaultUncaughtExceptionHandler()
        Thread.setDefaultUncaughtExceptionHandler { thread, throwable ->
            AppLogger.crash(thread, throwable)
            // Delegate to system handler so Android can show the crash dialog /
            // restart the app normally.
            defaultHandler?.uncaughtException(thread, throwable)
        }
        AppLogger.i("App", "Global crash handler installed")

        // ── 3. Schedule background sync ──────────────────────────────────────
        try {
            SyncWorker.schedulePeriodicSync(this)
            AppLogger.i("App", "SyncWorker periodic sync scheduled")
        } catch (e: Exception) {
            AppLogger.e("App", "Failed to schedule SyncWorker", e)
        }

        AppLogger.i("App", "CrmApplication.onCreate() complete")
    }
}
