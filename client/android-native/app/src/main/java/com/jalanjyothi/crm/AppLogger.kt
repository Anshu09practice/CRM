package com.jalanjyothi.crm

import android.content.Context
import android.os.Build
import android.util.Log
import java.io.File
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * Central diagnostic logger.
 *
 * Every call goes to two sinks simultaneously:
 *  1. Logcat  — filter with:  adb logcat JJ_CRM:V "*:S"
 *  2. File    — pulled with:  adb pull <path printed at startup>
 *
 * The file is kept in external app-specific storage so no special permissions
 * are needed on API 29+ and it survives app updates (but is removed on uninstall).
 * File rotates when it exceeds 512 KB to avoid filling the device.
 */
object AppLogger {

    const val TAG = "JJ_CRM"
    private const val MAX_FILE_SIZE = 512 * 1024L // 512 KB

    @Volatile private var logFile: File? = null
    private val fmt = SimpleDateFormat("MM-dd HH:mm:ss.SSS", Locale.US)

    // ─── Initialisation ───────────────────────────────────────────────────────

    fun init(context: Context) {
        val dir = context.getExternalFilesDir(null) ?: context.filesDir
        val file = File(dir, "crm_debug.log")

        // Rotate: discard old log when it exceeds the size limit
        if (file.exists() && file.length() > MAX_FILE_SIZE) {
            file.delete()
        }

        logFile = file

        val versionName = try {
            context.packageManager.getPackageInfo(context.packageName, 0).versionName ?: "?"
        } catch (_: Exception) { "?" }

        val sep = "=".repeat(60)
        val header = buildString {
            appendLine(sep)
            appendLine("JJ CRM v$versionName  —  log started")
            appendLine("Device  : ${Build.MANUFACTURER} ${Build.MODEL} (${Build.DEVICE})")
            appendLine("Android : ${Build.VERSION.RELEASE}  (API ${Build.VERSION.SDK_INT})")
            appendLine("ABI     : ${Build.SUPPORTED_ABIS.firstOrNull() ?: "?"}")
            appendLine("Fingerp : ${Build.FINGERPRINT}")
            appendLine("LogFile : ${file.absolutePath}")
            appendLine(sep)
        }

        Log.i(TAG, "\n$header")
        rawWrite(header)
    }

    // ─── Public API ───────────────────────────────────────────────────────────

    fun d(subtag: String, msg: String) {
        Log.d("$TAG/$subtag", msg)
        rawWrite("D $subtag: $msg")
    }

    fun i(subtag: String, msg: String) {
        Log.i("$TAG/$subtag", msg)
        rawWrite("I $subtag: $msg")
    }

    fun w(subtag: String, msg: String) {
        Log.w("$TAG/$subtag", msg)
        rawWrite("W $subtag: $msg")
    }

    fun e(subtag: String, msg: String, throwable: Throwable? = null) {
        if (throwable != null) {
            Log.e("$TAG/$subtag", msg, throwable)
            rawWrite("E $subtag: $msg\n${throwable.stackTraceToString()}")
        } else {
            Log.e("$TAG/$subtag", msg)
            rawWrite("E $subtag: $msg")
        }
    }

    /**
     * Called by the global [Thread.UncaughtExceptionHandler] set in [CrmApplication].
     * Writes the full stacktrace synchronously before the OS kills the process.
     */
    fun crash(thread: Thread, throwable: Throwable) {
        val stack = throwable.stackTraceToString()
        Log.e("$TAG/CRASH", "!!! FATAL on thread '${thread.name}' !!!\n$stack")
        rawWrite("!!! FATAL CRASH on thread '${thread.name}' !!!\n$stack\n${"!".repeat(60)}")
    }

    /** Absolute path of the on-device log file — log with `adb pull <path>`. */
    fun getLogFilePath(): String? = logFile?.absolutePath

    // ─── Internal ─────────────────────────────────────────────────────────────

    private fun rawWrite(msg: String) {
        val file = logFile ?: return
        try {
            file.appendText("[${fmt.format(Date())}] $msg\n")
        } catch (_: Exception) {
            // Never let the logger crash the app
        }
    }
}
