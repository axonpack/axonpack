package expo.modules.axonpackpreview

import android.content.Context
import android.net.nsd.NsdManager
import android.net.nsd.NsdServiceInfo
import android.util.Log
import java.net.Inet4Address

/**
 * Browses for the `preview start` servers that a registry announces over Bonjour, and resolves
 * each to an IPv4 address and port, which is what JS needs to reach its Metro.
 */
internal class BonjourBrowser(
  context: Context,
  private val onChange: (List<Map<String, Any?>>) -> Unit,
) {
  private val manager = context.getSystemService(Context.NSD_SERVICE) as? NsdManager
  private var listener: NsdManager.DiscoveryListener? = null
  private val found = mutableMapOf<String, Map<String, Any?>>()

  // Before Android 14, NsdManager fails a resolve while another one runs, so they take turns.
  private val waiting = ArrayDeque<NsdServiceInfo>()
  private var resolving = false

  @Synchronized
  fun start() {
    val manager = manager ?: return
    if (listener != null) return
    val listener = object : NsdManager.DiscoveryListener {
      override fun onDiscoveryStarted(serviceType: String) = Unit
      override fun onDiscoveryStopped(serviceType: String) = Unit
      override fun onStartDiscoveryFailed(serviceType: String, errorCode: Int) = failed(this, errorCode)
      override fun onStopDiscoveryFailed(serviceType: String, errorCode: Int) = Unit
      override fun onServiceFound(info: NsdServiceInfo) = queue(info)
      override fun onServiceLost(info: NsdServiceInfo) = lost(info)
    }
    this.listener = listener
    manager.discoverServices(TYPE, NsdManager.PROTOCOL_DNS_SD, listener)
  }

  @Synchronized
  fun stop() {
    listener?.let { runCatching { manager?.stopServiceDiscovery(it) } }
    listener = null
    waiting.clear()
    found.clear()
  }

  @Synchronized
  private fun failed(which: NsdManager.DiscoveryListener, errorCode: Int) {
    Log.d(TAG, "Bonjour: browsing did not start, error $errorCode")
    // A later start may try again.
    if (listener === which) listener = null
  }

  @Synchronized
  private fun queue(info: NsdServiceInfo) {
    waiting.add(info)
    next()
  }

  @Synchronized
  private fun lost(info: NsdServiceInfo) {
    waiting.removeAll { it.serviceName == info.serviceName }
    if (found.remove(info.serviceName) != null) onChange(found.values.toList())
  }

  private fun next() {
    if (resolving || listener == null) return
    val info = waiting.removeFirstOrNull() ?: return
    val manager = manager ?: return
    resolving = true
    // The replacement, registerServiceInfoCallback, is Android 14 and up only.
    @Suppress("DEPRECATION")
    manager.resolveService(
      info,
      object : NsdManager.ResolveListener {
        override fun onResolveFailed(info: NsdServiceInfo, errorCode: Int) {
          Log.d(TAG, "Bonjour: resolving ${info.serviceName} failed, error $errorCode")
          resolved(null)
        }
        override fun onServiceResolved(info: NsdServiceInfo) = resolved(info)
      },
    )
  }

  @Synchronized
  private fun resolved(info: NsdServiceInfo?) {
    resolving = false
    // Only IPv4: the registry announces no IPv6 address. Android 14 and up list the IPv4
    // addresses first, so `host` is IPv6 only when no IPv4 one had arrived.
    @Suppress("DEPRECATION")
    val address = info?.host
    val host = address as? Inet4Address
    if (info != null && host == null) Log.d(TAG, "Bonjour: ${info.serviceName} is skipped, it has no IPv4 address ($address)")
    // Nothing is kept once browsing stopped.
    if (info != null && host != null && listener != null) {
      found[info.serviceName] = mapOf(
        "name" to info.serviceName,
        "host" to host.hostAddress,
        "port" to info.port,
        "txt" to info.attributes.mapValues { (_, value) -> value?.decodeToString() ?: "" },
      )
      Log.d(TAG, "Bonjour: ${info.serviceName} is at ${host.hostAddress}:${info.port}")
      onChange(found.values.toList())
    }
    next()
  }

  private companion object {
    const val TYPE = "_axon-preview._tcp"
  }
}
