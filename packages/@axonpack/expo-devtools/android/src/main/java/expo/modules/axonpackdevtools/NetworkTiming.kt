package expo.modules.axonpackdevtools

import com.facebook.react.modules.network.OkHttpClientProvider
import java.io.IOException
import okhttp3.Call
import okhttp3.Connection
import okhttp3.EventListener

/**
 * Connection-phase timing on Android.
 *
 * The phases inside a request — queueing, DNS, TCP, TLS — are measured by OkHttp and reported nowhere
 * JavaScript can reach. React Native's own `PerformanceResourceTiming` looks like the JS answer and is
 * not: it fills those fields from the same three instants a patch already sees, so queueing comes out
 * as zero and connection setup as the whole wait. OkHttp's `EventListener` is the real measurement,
 * and a documented extension point rather than a patch — one listener per call, told when each phase
 * begins and ends.
 *
 * **Installed from `Application.onCreate`, and that is the whole point.** The first attempt at this
 * installed from JavaScript during `init()` and reported nothing at all: `NetworkingModule` and Expo's
 * fetch each ask `OkHttpClientProvider.createClient()` for a client, and by the time JavaScript runs,
 * something in startup has usually asked already. Going in with the application means the factory is
 * in place before anything can ask.
 *
 * `WebSocketModule` is the one path this misses: it builds its own `OkHttpClient.Builder()` and never
 * consults the provider, so a socket's phases are not reported here.
 */
internal object NetworkPhaseReporter {
  /** Set by the module while a JavaScript listener is attached, and the only thing that emits. */
  @Volatile var emit: ((Map<String, Any?>) -> Unit)? = null

  /** Whether the factory went in. Reported to JavaScript, which says so in the Timing tab. */
  @Volatile var installed = false
    private set

  fun record(payload: Map<String, Any?>) {
    emit?.invoke(payload)
  }

  /**
   * Idempotent, because the application can be created more than once in a process that keeps the
   * VM alive across activities.
   */
  fun install() {
    if (installed) return
    try {
      OkHttpClientProvider.setOkHttpClientFactory {
        OkHttpClientProvider.createClientBuilder()
          .eventListenerFactory(
            object : EventListener.Factory {
              override fun create(call: Call): EventListener = PhaseEventListener()
            }
          )
          .build()
      }
      installed = true
    } catch (error: Throwable) {
      // An OkHttp or React Native this build does not match is a missing tier, not a failure.
      installed = false
    }
  }
}

/**
 * One call's phases. Durations come from `nanoTime`, which is monotonic; the single wall-clock reading
 * is taken at the start so JavaScript can line the record up with the row it belongs to.
 */
internal class PhaseEventListener : EventListener() {
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
  private var wireBytes = -1L

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
    proxy: java.net.Proxy,
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
    protocol: okhttp3.Protocol?,
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
    // Bytes off the socket, not bytes handed to the caller: this listener sits below OkHttp's
    // transparent gunzip. Read as the decoded size at first, which made every response look
    // uncompressed — the same response iOS measured as 4,010 on the wire and 24,311 after decoding
    // arrived here as 4,005 twice over. The decoded size is the body JavaScript already stored, so
    // only this half is sent.
    wireBytes = byteCount
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
    val workStart = listOf(dnsStart, connectStart, requestStart).firstOrNull { it != 0L } ?: 0L

    NetworkPhaseReporter.record(
      mapOf(
        "url" to target,
        "startMs" to startedAtEpochMs,
        "queuedMs" to millis(callStart, workStart),
        "dnsMs" to millis(dnsStart, dnsEnd),
        // TLS is measured on its own, so the connect phase stops where the handshake starts.
        "tcpMs" to millis(connectStart, if (secureStart != 0L) secureStart else connectEnd),
        "tlsMs" to millis(secureStart, secureEnd),
        "sendMs" to millis(requestStart, requestEnd),
        "waitMs" to millis(if (requestEnd != 0L) requestEnd else requestStart, responseStart),
        "downloadMs" to millis(responseStart, responseEnd),
        "reusedConnection" to reusedConnection,
        "protocol" to protocol,
        "wireBytes" to if (wireBytes >= 0) wireBytes.toDouble() else null,
        "measuredBy" to "okhttp",
      )
    )
  }
}
