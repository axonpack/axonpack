package expo.modules.axonpackpreview

import android.content.Context
import android.content.pm.PackageManager
import android.preference.PreferenceManager
import android.util.Log
import com.facebook.react.ReactHost
import com.facebook.react.common.build.ReactBuildConfig
import com.facebook.react.internal.featureflags.ReactNativeFeatureFlags
import com.facebook.react.modules.systeminfo.AndroidInfoHelpers
import com.facebook.react.packagerconnection.PackagerConnectionSettings
import java.io.File
import java.util.UUID
import org.json.JSONArray
import org.json.JSONObject

internal const val TAG = "AxonpackPreview"

/**
 * Which bundle the next start should load. JS writes `state.json` under the folder expo-file-system
 * calls the documents directory, and native only ever reads it. The bundle path in it is relative,
 * so the state still holds if the app's files folder moves.
 */
internal object PreviewState {
  fun root(context: Context) = File(context.filesDir, "preview")

  /**
   * Previews need the New Architecture. Anything else, including a React Native too old to answer,
   * counts as the old one, which only ever gets the base bundle.
   */
  fun newArchitecture(): Boolean =
    try {
      ReactNativeFeatureFlags.enableBridgelessArchitecture()
    } catch (e: Throwable) {
      false
    }

  fun warnOldArchitecture() =
    Log.w(TAG, "@axonpack/preview needs the New Architecture, so the selected preview is ignored and the base bundle loads")

  /** The selected preview if this app can run it, else null for the base bundle. */
  fun bundleToLoad(context: Context): File? {
    val bundle = selectedBundle(context) ?: return null
    if (!madeForThisBuild(context)) return null
    if (!newArchitecture()) {
      warnOldArchitecture()
      return null
    }
    val embedded = embeddedHermesVersion(context)
    val preview = bundle.inputStream().use { HermesHeader.version(it) }
    if (embedded != null && preview != null && embedded != preview) {
      Log.w(TAG, "The preview is Hermes bytecode $preview but this build runs $embedded, so the base bundle loads")
      return null
    }
    if (!claimStart(context)) return null
    return bundle
  }

  // The bundle inside the app was compiled by the Hermes this build runs. A debug build has none,
  // and then nothing is checked.
  private var embeddedVersion: Int? = null
  private var embeddedChecked = false

  private fun embeddedHermesVersion(context: Context): Int? {
    if (!embeddedChecked) {
      embeddedVersion = try {
        context.assets.open("index.android.bundle").use { HermesHeader.version(it) }
      } catch (e: Exception) {
        null
      }
      embeddedChecked = true
    }
    return embeddedVersion
  }

  /**
   * A debug build asks Metro before the bundle loader, unless its dev support has a bundle file set.
   * So in a debug build the selected preview goes there, and clearing it hands the start back to
   * Metro. Release builds never ask Metro and are left alone.
   */
  fun pointDevSupport(context: Context, host: ReactHost?) {
    if (!ReactBuildConfig.DEBUG || host == null) return
    val devSupport = host.devSupportManager ?: return
    val settings = devSupport.devSettings?.packagerConnectionSettings
    val local = localServerHostPort(context)
    if (local != null && settings != null) {
      // A local Metro server wins over a downloaded preview and the default Metro (debug only).
      saveDebugHost(context)
      settings.debugServerHost = local
      devSupport.bundleFilePath = null
      return
    }
    if (settings != null) restoreDebugHost(context, settings)
    devSupport.bundleFilePath = bundleToLoad(context)?.absolutePath
  }

  // Local Metro servers (debug builds only). `localServer` sits next to the preview fields and
  // never changes them, so stopping a local server brings back whatever preview was chosen.

  /** The chosen local server as `host:port`, or null; always null in a release build. */
  fun localServerHostPort(context: Context): String? {
    if (!ReactBuildConfig.DEBUG) return null
    return readJson(context).optJSONObject("localServer")?.optString("hostPort")?.ifEmpty { null }
  }

  fun selectLocalServer(context: Context, url: String?, hostPort: String?) {
    val json = readJson(context)
    if (url == null || hostPort == null) {
      json.remove("localServer")
    } else {
      json.put("localServer", JSONObject().put("url", url).put("hostPort", hostPort))
    }
    writeJson(context, json)
  }

  // The dev menu's "Change bundle location" lives in the same preference, so the developer's own
  // value is kept aside while a local server is in use, and put back when it stops.
  private const val DEBUG_HOST_PREF = "debug_http_host"

  /**
   * `host:port` of the Metro the app starts on with nothing chosen: the developer's own "Change
   * bundle location" (kept aside while a local server is in use), or the build's default. Null in a
   * release build.
   */
  private fun defaultServer(context: Context, json: JSONObject): String? {
    if (!ReactBuildConfig.DEBUG) return null
    val own =
      if (json.has("savedDebugHost")) json.optString("savedDebugHost")
      else PreferenceManager.getDefaultSharedPreferences(context).getString(DEBUG_HOST_PREF, null)
    return own?.ifEmpty { null } ?: AndroidInfoHelpers.getServerHost(context)
  }

  private fun saveDebugHost(context: Context) {
    val json = readJson(context)
    if (json.has("savedDebugHost")) return
    val prefs = PreferenceManager.getDefaultSharedPreferences(context)
    json.put("savedDebugHost", prefs.getString(DEBUG_HOST_PREF, null) ?: "")
    writeJson(context, json)
  }

  private fun restoreDebugHost(context: Context, settings: PackagerConnectionSettings) {
    val json = readJson(context)
    if (!json.has("savedDebugHost")) return
    val saved = json.optString("savedDebugHost")
    if (saved.isEmpty()) settings.resetDebugServerHost() else settings.debugServerHost = saved
    json.remove("savedDebugHost")
    writeJson(context, json)
  }

  // Crash fallback. Every JS start has its own token. A preview start writes it into the state as
  // `pending`, and JS clears it once the app has mounted. Finding someone else's token means an
  // earlier start of this preview never got that far, so the preview is marked broken and the base
  // bundle loads instead. Several lookups in one start see their own token and change nothing.
  private val processToken = UUID.randomUUID().toString()
  private var starts = 0
  private fun token() = "$processToken:$starts"

  /** Called before a reload, so the next start has a token of its own. */
  fun nextStart() {
    starts++
  }

  private fun stateFile(context: Context) = File(root(context), "state.json")

  private fun readJson(context: Context): JSONObject =
    try {
      val file = stateFile(context)
      if (file.isFile) JSONObject(file.readText()) else JSONObject()
    } catch (e: Exception) {
      JSONObject()
    }

  private fun writeJson(context: Context, json: JSONObject) {
    root(context).mkdirs()
    stateFile(context).writeText(json.toString())
  }

  private fun brokenIds(json: JSONObject): List<String> {
    val array = json.optJSONArray("broken") ?: return emptyList()
    return (0 until array.length()).map { array.getString(it) }
  }

  private fun claimStart(context: Context): Boolean {
    val json = readJson(context)
    val pending = json.optString("pending")
    if (pending == token()) return true
    if (pending.isNotEmpty()) {
      val id = json.optString("bundle").substringBefore("/")
      Log.w(TAG, "The preview \"$id\" stopped before it finished starting, so it is marked broken and the base bundle loads")
      json.put("broken", JSONArray(brokenIds(json) + id))
      json.remove("bundle")
      json.remove("pending")
      writeJson(context, json)
      return false
    }
    json.put("pending", token())
    writeJson(context, json)
    return true
  }

  /**
   * The running start threw before JS confirmed it. True when that start was a preview: it is then
   * marked broken and taken off the selection, so the next start is the base bundle.
   */
  fun failStart(context: Context): Boolean {
    val json = readJson(context)
    val bundle = json.optString("bundle")
    if (bundle.isEmpty() || json.optString("pending") != token()) return false
    val id = bundle.substringBefore("/")
    Log.w(TAG, "The preview \"$id\" failed while starting, so it is marked broken and the base bundle loads")
    json.put("broken", JSONArray(brokenIds(json) + id))
    json.remove("bundle")
    json.remove("pending")
    writeJson(context, json)
    return true
  }

  /** JS calls this once the app has mounted: this start worked. */
  fun confirmStart(context: Context) {
    val json = readJson(context)
    if (json.optString("pending") == token()) {
      json.remove("pending")
      writeJson(context, json)
    }
  }

  /**
   * Records the choice for the next start or reload. Null clears it, so the base bundle loads. The
   * path is relative to the preview folder and must stay inside it. Choosing a preview again takes
   * it off the broken list, since it may have been fixed and downloaded again.
   */
  /** The key the config plugin baked into this build; null without the plugin. */
  private fun buildKey(context: Context): String? =
    try {
      context.packageManager
        .getApplicationInfo(context.packageName, PackageManager.GET_META_DATA)
        .metaData
        ?.getString("dev.axonpack.preview.KEY")
    } catch (e: Exception) {
      null
    }

  /**
   * A preview chosen on an earlier build (the app was updated since) is not loaded: with app
   * version matching, a new version is a new native build. The choice is cleared, so the app and
   * the list both show the base bundle. Without a key on either side there is nothing to compare.
   */
  private fun madeForThisBuild(context: Context): Boolean {
    val json = readJson(context)
    val chosenFor = json.optString("key")
    val build = buildKey(context)
    if (chosenFor.isEmpty() || build == null || chosenFor == build) return true
    Log.w(TAG, "The chosen preview was made for build $chosenFor but this is $build, so the base bundle loads")
    json.remove("bundle")
    json.remove("key")
    json.remove("pending")
    writeJson(context, json)
    return false
  }

  fun select(context: Context, bundle: String?, key: String? = null) {
    val root = root(context)
    val json = readJson(context)
    json.remove("pending")
    if (bundle == null) {
      json.remove("bundle")
      json.remove("key")
    } else {
      require(File(root, bundle).canonicalPath.startsWith(root.canonicalPath + File.separator)) {
        "The bundle path must stay inside the preview folder"
      }
      json.put("bundle", bundle)
      if (key != null) json.put("key", key) else json.remove("key")
      json.put("broken", JSONArray(brokenIds(json) - bundle.substringBefore("/")))
    }
    writeJson(context, json)
  }

  /** The raw choice and the broken list, for JS to show. */
  fun read(context: Context): Map<String, Any?> {
    val json = readJson(context)
    return mapOf(
      "bundle" to json.optString("bundle").ifEmpty { null },
      "broken" to brokenIds(json),
      "localServer" to json.optJSONObject("localServer")?.optString("url")?.ifEmpty { null },
      "defaultServer" to defaultServer(context, json),
    )
  }

  /** Null means "load the base bundle", which is also the answer to anything unexpected. */
  fun selectedBundle(context: Context): File? {
    return try {
      val root = root(context)
      val state = File(root, "state.json")
      if (!state.isFile) return null
      val relative = JSONObject(state.readText()).optString("bundle")
      if (relative.isEmpty()) return null
      val bundle = File(root, relative)
      // A path like "../x" must not let the state point outside our own folder.
      if (!bundle.canonicalPath.startsWith(root.canonicalPath + File.separator) || !bundle.isFile) {
        Log.w(TAG, "Selected bundle \"$relative\" is missing, loading the base bundle")
        return null
      }
      bundle
    } catch (e: Exception) {
      Log.w(TAG, "Could not read the preview state, loading the base bundle", e)
      null
    }
  }
}
