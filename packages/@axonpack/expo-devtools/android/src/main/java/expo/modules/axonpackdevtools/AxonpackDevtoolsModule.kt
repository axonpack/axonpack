package expo.modules.axonpackdevtools

import android.app.ActivityManager
import android.content.Context
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
