package expo.modules.axonpackdevtools

import android.app.ActivityManager
import android.content.Context
import android.os.Build
import android.os.Debug
import android.os.Environment
import android.os.Handler
import android.os.Looper
import android.os.Process
import android.os.StatFs
import android.os.SystemClock
import android.view.Choreographer
import com.facebook.react.modules.network.OkHttpClientProvider
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File
import java.io.IOException
import java.io.PrintWriter
import java.io.StringWriter
import okhttp3.Call
import okhttp3.Connection
import okhttp3.EventListener
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


/**
 * Connection-phase timing.
 *
 * The phases inside a request — queueing, DNS, TCP, TLS — are measured by OkHttp and reported nowhere
 * JavaScript can reach. React Native's own `PerformanceResourceTiming` looks like the JS answer and is
 * not: it fills those fields from the same three instants a JS patch already sees, so queueing comes
 * out as zero and connection setup as the whole wait. OkHttp's `EventListener` is the real
 * measurement, and it is a documented extension point rather than a patch — one listener per call,
 * told when each phase begins and ends.
 *
 * Durations come from `nanoTime`, which is monotonic, while the one wall-clock reading is taken at the
 * start so JavaScript can line the record up with the row it belongs to.
 */
private class PhaseEventListener(private val emit: (Map<String, Any?>) -> Unit) : EventListener() {
  private var startedAtEpochMs = 0.0
  private var callStart = 0L
  private var dnsStart = 0L
  private var dnsEnd = 0L
  private var connectStart = 0L
  private var secureStart = 0L
  private var secureEnd = 0L
  private var connectEnd = 0L
  private var requestStart = 0L
  private var requestEnd = 0L
  private var responseStart = 0L
  private var responseEnd = 0L
  private var reusedConnection = true
  private var protocol: String? = null
  private var url: String? = null
  private var decodedBytes = -1L

  /** Null rather than zero for a phase that never happened — a reused connection has no handshake. */
  private fun millis(from: Long, to: Long): Double? =
      if (from == 0L || to == 0L || to < from) null else (to - from) / 1_000_000.0

  override fun callStart(call: Call) {
    startedAtEpochMs = System.currentTimeMillis().toDouble()
    callStart = System.nanoTime()
    url = call.request().url.toString()
  }

  override fun dnsStart(call: Call, domainName: String) {
    dnsStart = System.nanoTime()
  }

  override fun dnsEnd(call: Call, domainName: String, inetAddressList: List<java.net.InetAddress>) {
    dnsEnd = System.nanoTime()
  }

  override fun connectStart(
      call: Call,
      inetSocketAddress: java.net.InetSocketAddress,
      proxy: java.net.Proxy
  ) {
    // Reaching here at all means a connection had to be opened for this call.
    reusedConnection = false
    connectStart = System.nanoTime()
  }

  override fun secureConnectStart(call: Call) {
    secureStart = System.nanoTime()
  }

  override fun secureConnectEnd(call: Call, handshake: okhttp3.Handshake?) {
    secureEnd = System.nanoTime()
  }

  override fun connectEnd(
      call: Call,
      inetSocketAddress: java.net.InetSocketAddress,
      proxy: java.net.Proxy,
      protocol: okhttp3.Protocol?
  ) {
    connectEnd = System.nanoTime()
    this.protocol = protocol?.toString()
  }

  override fun connectionAcquired(call: Call, connection: Connection) {
    if (protocol == null) protocol = connection.protocol().toString()
  }

  override fun requestHeadersStart(call: Call) {
    requestStart = System.nanoTime()
  }

  override fun requestHeadersEnd(call: Call, request: okhttp3.Request) {
    requestEnd = System.nanoTime()
  }

  override fun requestBodyEnd(call: Call, byteCount: Long) {
    // A request with a body is not sent until the body is, so this is the later of the two.
    requestEnd = System.nanoTime()
  }

  override fun responseHeadersStart(call: Call) {
    responseStart = System.nanoTime()
  }

  override fun responseBodyEnd(call: Call, byteCount: Long) {
    responseEnd = System.nanoTime()
    // What the caller read, which is the decoded body: OkHttp gunzips transparently below this.
    decodedBytes = byteCount
  }

  override fun callEnd(call: Call) {
    report()
  }

  override fun callFailed(call: Call, ioe: IOException) {
    // Still reported: how far a request got before it failed is the most useful thing about it.
    report()
  }

  private fun report() {
    val target = url ?: return
    // Whichever phase came first is where the call stopped waiting to be worked on.
    val workStart = listOf(dnsStart, connectStart, requestStart).firstOrNull { it != 0L }
    emit(
        mapOf(
            "url" to target,
            "startMs" to startedAtEpochMs,
            "queuedMs" to millis(callStart, workStart ?: 0L),
            "dnsMs" to millis(dnsStart, dnsEnd),
            // TLS is measured on its own, so the connect phase stops where the handshake starts.
            "tcpMs" to millis(connectStart, if (secureStart != 0L) secureStart else connectEnd),
            "tlsMs" to millis(secureStart, secureEnd),
            "sendMs" to millis(requestStart, requestEnd),
            "waitMs" to millis(if (requestEnd != 0L) requestEnd else requestStart, responseStart),
            "downloadMs" to millis(responseStart, responseEnd),
            "reusedConnection" to reusedConnection,
            "protocol" to protocol,
            // The wire count comes from the interceptor below rather than from here, because by the
            // time a body reaches this listener OkHttp has already decoded it.
            "wireBytes" to WireSizes.take(target),
            "decodedBytes" to if (decodedBytes >= 0) decodedBytes.toDouble() else null,
            "measuredBy" to "okhttp",
        ))
  }
}

/**
 * How many bytes a response actually carried, before OkHttp decoded it.
 *
 * A *network* interceptor sits below transparent gzip and so sees the encoded body and the
 * `Content-Length` that describes it; an application interceptor — and the event listener above —
 * sees what the caller reads, already decoded. Both numbers are needed and only one is visible from
 * each side, so the interceptor leaves its reading here for the listener to collect.
 *
 * Keyed by URL and taken once, because that is all the two sides share. A reading nobody collects is
 * dropped when the map is at its cap rather than growing without bound.
 */
private object WireSizes {
  private const val MAX_PENDING = 64
  private val pending = java.util.concurrent.ConcurrentHashMap<String, Long>()

  fun put(url: String, bytes: Long) {
    if (pending.size >= MAX_PENDING) pending.clear()
    pending[url] = bytes
  }

  fun take(url: String): Double? = pending.remove(url)?.toDouble()
}

/** Whether the listener has been put in front of React Native's client factory already. */
private var networkTimingInstalled = false

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
    Events("onNetworkPhases")

    /**
     * Returns whether phases will actually be reported, which is what the Timing tab says out loud.
     *
     * The listener is installed by replacing React Native's OkHttp client *factory*, which is the
     * documented seam — but `NetworkingModule` asks that factory for a client once, when JavaScript
     * first touches networking. So this has to run before the app's first request, which is why the
     * client installs it from `init()` and not when the panel opens. A request made before then is a
     * row without phases rather than a wrong one.
     */
    Function("installNetworkTimingReporter") { ->
      if (networkTimingInstalled) return@Function true
      try {
        OkHttpClientProvider.setOkHttpClientFactory {
          OkHttpClientProvider.createClientBuilder()
              // Below transparent gzip, which is the only place the encoded size is still visible.
              .addNetworkInterceptor { chain ->
                val response = chain.proceed(chain.request())
                val wire =
                    response.header("content-length")?.toLongOrNull()
                        ?: response.body?.contentLength()?.takeIf { it >= 0 }
                if (wire != null) WireSizes.put(response.request.url.toString(), wire)
                response
              }
              .eventListenerFactory(
                  object : EventListener.Factory {
                    override fun create(call: Call): EventListener =
                        PhaseEventListener { payload -> sendEvent("onNetworkPhases", payload) }
                  })
              .build()
        }
        networkTimingInstalled = true
        true
      } catch (error: Throwable) {
        // An OkHttp or React Native this build does not match is a missing tier, not a failure.
        false
      }
    }

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
