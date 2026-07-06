package com.jalanjyothi.crm

import android.content.ContentUris
import android.content.ContentValues
import android.content.Context
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import android.util.Log
import java.io.File
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * Central diagnostic logger — writes every entry to two sinks:
 *
 *  1. Logcat      — filter with:  adb logcat JJ_CRM:V "*:S"
 *  2. Downloads   — visible in any file manager without ADB:
 *                   Android 10+  →  Downloads/crm_debug.log  (MediaStore)
 *                   Android 9-   →  Downloads/crm_debug.log  (direct file)
 *
 * File rotates automatically when it exceeds 512 KB.
 */
object AppLogger {

    const val TAG = "JJ_CRM"
    private const val LOG_FILE_NAME = "crm_debug.log"
    private const val MAX_FILE_SIZE = 512 * 1024L

    @Volatile private var appContext: Context? = null

    // API 28- : direct File reference into Downloads
    @Volatile private var legacyFile: File? = null

    // API 29+ : MediaStore URI, cached after first lookup
    @Volatile private var mediaStoreUri: android.net.Uri? = null

    private val fmt = SimpleDateFormat("MM-dd HH:mm:ss.SSS", Locale.US)

    // ─── Init ─────────────────────────────────────────────────────────────────

    fun init(context: Context) {
        appContext = context.applicationContext

        val logLocation = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            initMediaStore(context.applicationContext)
            "Downloads/$LOG_FILE_NAME  (open in Files app)"
        } else {
            @Suppress("DEPRECATION")
            val dir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
            dir.mkdirs()
            val file = File(dir, LOG_FILE_NAME)
            if (file.exists() && file.length() > MAX_FILE_SIZE) file.delete()
            legacyFile = file
            file.absolutePath
        }

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
            appendLine("LogFile : $logLocation")
            appendLine(sep)
        }

        Log.i(TAG, "\n$header")
        writeToStorage(header)
    }

    // ─── Public API ───────────────────────────────────────────────────────────

    fun d(subtag: String, msg: String) {
        Log.d("$TAG/$subtag", msg)
        writeToStorage("D $subtag: $msg")
    }

    fun i(subtag: String, msg: String) {
        Log.i("$TAG/$subtag", msg)
        writeToStorage("I $subtag: $msg")
    }

    fun w(subtag: String, msg: String) {
        Log.w("$TAG/$subtag", msg)
        writeToStorage("W $subtag: $msg")
    }

    fun e(subtag: String, msg: String, throwable: Throwable? = null) {
        if (throwable != null) {
            Log.e("$TAG/$subtag", msg, throwable)
            writeToStorage("E $subtag: $msg\n${throwable.stackTraceToString()}")
        } else {
            Log.e("$TAG/$subtag", msg)
            writeToStorage("E $subtag: $msg")
        }
    }

    /**
     * Called from the global [Thread.UncaughtExceptionHandler] in [CrmApplication].
     * Flushes the full crash stacktrace synchronously before the process dies.
     */
    fun crash(thread: Thread, throwable: Throwable) {
        val stack = throwable.stackTraceToString()
        Log.e("$TAG/CRASH", "!!! FATAL on thread '${thread.name}' !!!\n$stack")
        writeToStorage("!!! FATAL CRASH on thread '${thread.name}' !!!\n$stack\n${"!".repeat(60)}")
    }

    // ─── MediaStore (API 29+) ─────────────────────────────────────────────────

    private fun initMediaStore(ctx: Context) {
        try {
            val resolver   = ctx.contentResolver
            val collection = MediaStore.Downloads.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY)
            val projection = arrayOf(MediaStore.Downloads._ID, MediaStore.Downloads.SIZE)
            val selection  = "${MediaStore.Downloads.DISPLAY_NAME} = ?"

            resolver.query(collection, projection, selection, arrayOf(LOG_FILE_NAME), null)
                ?.use { cursor ->
                    if (cursor.moveToFirst()) {
                        val id   = cursor.getLong(cursor.getColumnIndexOrThrow(MediaStore.Downloads._ID))
                        val size = cursor.getLong(cursor.getColumnIndexOrThrow(MediaStore.Downloads.SIZE))
                        if (size > MAX_FILE_SIZE) {
                            // Rotate: delete the oversized file
                            resolver.delete(ContentUris.withAppendedId(collection, id), null, null)
                        } else {
                            mediaStoreUri = ContentUris.withAppendedId(collection, id)
                            return
                        }
                    }
                }

            // Create fresh log file in Downloads
            val values = ContentValues().apply {
                put(MediaStore.Downloads.DISPLAY_NAME, LOG_FILE_NAME)
                put(MediaStore.Downloads.MIME_TYPE, "text/plain")
            }
            mediaStoreUri = resolver.insert(collection, values)
        } catch (_: Exception) { /* MediaStore unavailable — storage writes disabled */ }
    }

    // ─── Write dispatcher ─────────────────────────────────────────────────────

    private fun writeToStorage(msg: String) {
        val line = "[${fmt.format(Date())}] $msg\n"
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            val ctx = appContext ?: return
            if (mediaStoreUri == null) initMediaStore(ctx)  // lazy retry if init failed
            val uri = mediaStoreUri ?: return
            try {
                ctx.contentResolver.openOutputStream(uri, "wa")?.use { out ->
                    out.write(line.toByteArray(Charsets.UTF_8))
                }
            } catch (_: Exception) {
                mediaStoreUri = null  // force re-lookup on next write
            }
        } else {
            try { legacyFile?.appendText(line) } catch (_: Exception) {}
        }
    }
}
