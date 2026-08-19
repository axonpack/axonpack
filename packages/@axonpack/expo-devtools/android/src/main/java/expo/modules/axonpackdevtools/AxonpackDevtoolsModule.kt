package expo.modules.axonpackdevtools

import android.app.ActivityManager
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Debug
import android.os.Environment
import android.os.Handler
import android.os.Looper
import android.os.Process
import android.os.StatFs
import android.os.SystemClock
import android.view.Choreographer
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File
import java.io.PrintWriter
import java.io.StringWriter
import org.json.JSONArray
import org.json.JSONObject

/**
 * The only native code in this package, and it exists to *cause* problems rather than measure them:
 * the Limiter section needs to stall or kill the main thread, which JavaScript cannot reach.
 *
 * Optional on the JS side, so an app without a dev client keeps working — it just can't reach the
 * main thread.
 */
/**
 * Frames the *main* thread actually rendered. A `requestAnimationFrame` loop in JS cannot see this: the
 * UI thread can be fully stalled while JS keeps ticking, which is the blind spot the FPS card warns
 * about. `Choreographer` posts on the main looper, so it stops counting exactly when the UI stops
 * drawing.
 */
private class UiFpsTracker : Choreographer.FrameCallback {
  private var frames = 0
  private var windowStartNanos = 0L
  private var running = false

  @Volatile
  var fps: Double = -1.0
    private set

  /** Must be posted to the main looper — `Choreographer.getInstance()` is per-thread. */
  fun start() {
    Handler(Looper.getMainLooper()).post {
      if (running) return@post
      running = true
      frames = 0
      windowStartNanos = System.nanoTime()
      Choreographer.getInstance().postFrameCallback(this)
    }
  }

  fun stop() {
    Handler(Looper.getMainLooper()).post {
      running = false
      fps = -1.0
    }
  }

  override fun doFrame(frameTimeNanos: Long) {
    if (!running) return
    frames += 1
    val elapsedSeconds = (frameTimeNanos - windowStartNanos) / 1_000_000_000.0
    if (elapsedSeconds >= 0.5) {
      fps = frames / elapsedSeconds
      frames = 0
      windowStartNanos = frameTimeNanos
    }
    Choreographer.getInstance().postFrameCallback(this)
  }
}


/**
 * Crash persistence.
 *
 * An uncaught Java or Kotlin exception takes the process down before JavaScript gets another turn, so
 * a report has to be written from the dying thread — the one part of crash reporting JS cannot do for
 * itself. Written as JSON Lines and appended: reading a file back in to rewrite it is the wrong thing
 * to be doing in a crash handler.
 *
 * `Thread.setDefaultUncaughtExceptionHandler` runs in ordinary context, so normal file IO is safe
 * here. NDK/native signal crashes are deliberately out of scope; catching those needs an
 * async-signal-safe handler that would also fight Crashlytics and Sentry over the same slot.
 */
private const val CRASH_FILE_NAME = "axonpack-devtools-crashes.jsonl"

private class CrashPersistingHandler(
  private val file: File,
  /** Whatever was installed before us — React Native's own, or a crash SDK's. */
  private val previous: Thread.UncaughtExceptionHandler?,
) : Thread.UncaughtExceptionHandler {

  override fun uncaughtException(thread: Thread, throwable: Throwable) {
    try {
      file.appendText(describe(thread, throwable) + "\n")
    } catch (_: Throwable) {
      // A failed report must not change how the app dies.
    }
    // Always delegate: swallowing this would leave the process alive in an undefined state, and
    // would take the app's real crash reporter down with it.
    previous?.uncaughtException(thread, throwable)
  }

  private fun describe(thread: Thread, throwable: Throwable): String {
    val trace = StringWriter()
    throwable.printStackTrace(PrintWriter(trace))

    val frames = JSONArray()
    for (element in throwable.stackTrace) frames.put(element.toString())

    return JSONObject()
      .put("kind", "native-exception")
      .put("name", throwable.javaClass.name)
      .put("message", throwable.message ?: "")
      .put("stack", trace.toString())
      .put("timestamp", System.currentTimeMillis())
      .put(
        "native",
        JSONObject()
          .put("type", throwable.javaClass.name)
          .put("thread", thread.name)
          .put("frames", frames),
      )
      .toString()
  }
}

class AxonpackDevtoolsModule : Module() {
  /** Captured when the module is constructed, which happens during native startup. */
  private val moduleInitEpochMs = System.currentTimeMillis().toDouble()

  /**
   * `getStartUptimeMillis` is on the uptime clock, so it's shifted onto the epoch to be comparable with
   * `Date.now()` in JS. Requires API 24, which is this module's `minSdkVersion`.
   */
  private fun processStartEpochMs(): Double =
    (System.currentTimeMillis() - SystemClock.uptimeMillis() + Process.getStartUptimeMillis())
      .toDouble()

  private val uiFps = UiFpsTracker()

  private var crashHandlerInstalled = false

  private fun crashFile(): File? =
    appContext.reactContext?.filesDir?.let { File(it, CRASH_FILE_NAME) }

  override fun definition() = ModuleDefinition {
    Name("AxonpackDevtools")

    // Started and stopped by the view, not at init: a frame callback keeps the main thread busy for as
    // long as it lives.
    Function("startUiFpsTracking") { uiFps.start() }
    Function("stopUiFpsTracking") { uiFps.stop() }
    /** -1 until the first window closes, so "not measured" stays distinct from a real zero. */
    Function("getUiFps") { uiFps.fps }

    /** Epoch milliseconds, so JS can line these up with its own `Date.now()` readings. */
    Function("getStartupTimestamps") {
      mapOf(
        "processStartMs" to processStartEpochMs(),
        "nativeModuleInitMs" to moduleInitEpochMs,
      )
    }

    /**
     * Busy-waits on the main looper. `Thread.sleep` would suspend and let the OS schedule other work,
     * which is not what a blocked UI thread looks like — spinning is the accurate simulation. Posted
     * rather than run inline so the call returns at once and JS stays responsive while the UI freezes.
     */
    /**
     * `totalPss` is the app's proportional set size in kilobytes — the share of physical memory
     * attributable to this process, which is what a user means by "memory" and is unrelated to the JS
     * heap read from Hermes. Android, unlike iOS, also reports system-wide free RAM.
     */
    Function("getMemoryMetrics") {
      val activityManager =
        appContext.reactContext?.getSystemService(Context.ACTIVITY_SERVICE) as? ActivityManager
      val info = ActivityManager.MemoryInfo()
      activityManager?.getMemoryInfo(info)

      val debugInfo = Debug.MemoryInfo()
      Debug.getMemoryInfo(debugInfo)

      mapOf(
        "appBytes" to debugInfo.totalPss.toDouble() * 1024,
        "totalBytes" to if (activityManager != null) info.totalMem.toDouble() else null,
        "availableToAppBytes" to if (activityManager != null) info.availMem.toDouble() else null,
      )
    }

    /**
     * `StatFs` on the data directory needs no permission and no manifest entry — READ/WRITE_EXTERNAL_
     * STORAGE only ever applied to shared storage. Read on demand rather than sampled: free space moves
     * slowly and crossing the bridge is not free.
     *
     * There is no iOS counterpart on purpose; see the Swift module for why.
     */
    Function("getStorageMetrics") {
      val stat = StatFs(Environment.getDataDirectory().path)
      mapOf(
        "totalBytes" to stat.totalBytes.toDouble(),
        "freeBytes" to stat.availableBytes.toDouble(),
      )
    }

    /** Null until the app's files directory is reachable, which it always is once a context exists. */
    Function("installCrashHandler") {
      val file = crashFile()
      if (file != null && !crashHandlerInstalled) {
        crashHandlerInstalled = true
        Thread.setDefaultUncaughtExceptionHandler(
          CrashPersistingHandler(file, Thread.getDefaultUncaughtExceptionHandler())
        )
      }
    }

    /**
     * Destructive by design: a record still in the file outlived the process that wrote it, which is
     * the only evidence we have that the app actually died rather than carried on.
     */
    Function("drainPendingCrashes") { ->
      val file = crashFile()
      if (file == null || !file.exists()) {
        emptyList<String>()
      } else {
        val lines = file.readLines().filter { it.isNotBlank() }
        file.delete()
        lines
      }
    }

    /** Used for JS fatals, which RN may follow with the process going down before anyone reads them. */
    Function("persistCrashRecord") { json: String ->
      crashFile()?.appendText(json + "\n")
    }

    Function("getDeviceInfo") { ->
      val context = appContext.reactContext
      val packageInfo =
        context?.packageManager?.getPackageInfo(context.packageName, 0)
      val activityManager =
        context?.getSystemService(Context.ACTIVITY_SERVICE) as? ActivityManager
      val memory = ActivityManager.MemoryInfo()
      activityManager?.getMemoryInfo(memory)

      mapOf(
        "platform" to "android",
        "osVersion" to "${Build.VERSION.RELEASE} (API ${Build.VERSION.SDK_INT})",
        "model" to Build.MODEL,
        "brand" to Build.MANUFACTURER,
        "appVersion" to packageInfo?.versionName,
        "buildVersion" to packageInfo?.let {
          if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) it.longVersionCode.toString()
          else @Suppress("DEPRECATION") it.versionCode.toString()
        },
        "bundleId" to context?.packageName,
        // A heuristic, not a guarantee — there is no supported emulator query, and a wrong `false`
        // is less misleading in a bug report than omitting the field.
        "isEmulator" to (Build.FINGERPRINT.startsWith("generic") ||
          Build.FINGERPRINT.contains("emulator") ||
          Build.MODEL.contains("sdk_gphone")),
        "totalMemoryBytes" to if (activityManager != null) memory.totalMem.toDouble() else null,
        "availableMemoryBytes" to if (activityManager != null) memory.availMem.toDouble() else null,
      )
    }

    /**
     * Relaunches the app: start the launcher activity on a fresh task, then end this process so the
     * new one comes up clean. Killing the process is the point — a soft JS reload would leave behind
     * whatever native state the crash happened in.
     *
     * There is deliberately no iOS counterpart; see the Swift module.
     */
    Function("restartApp") {
      val context = appContext.reactContext
      val intent = context?.packageManager?.getLaunchIntentForPackage(context.packageName)
      if (intent != null) {
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK)
        Handler(Looper.getMainLooper()).post {
          context.startActivity(intent)
          Runtime.getRuntime().exit(0)
        }
      }
    }

    Function("blockMainThread") { durationMs: Double ->
      Handler(Looper.getMainLooper()).post {
        val startedAt = System.currentTimeMillis()
        while (System.currentTimeMillis() - startedAt < durationMs.toLong()) {
          // Deliberately empty: occupy the thread rather than yield it.
        }
      }
    }

    Function("crashMainThread") { message: String ->
      Handler(Looper.getMainLooper()).post { throw RuntimeException(message) }
    }
  }
}
