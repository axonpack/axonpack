package expo.modules.axonpackpreviewready

import android.content.Context
import android.util.Log
import com.facebook.react.ReactHost
import com.facebook.react.common.build.ReactBuildConfig
import com.facebook.react.internal.featureflags.ReactNativeFeatureFlags
import org.json.JSONObject
import java.io.File

internal const val TAG = "AxonpackPreviewReady"

/**
 * Which bundle the next start should load. JS writes `state.json` under the folder expo-file-system
 * calls the documents directory, and native only ever reads it. The bundle path in it is relative,
 * so the state still holds if the app's files folder moves.
 */
internal object PreviewState {
  fun root(context: Context) = File(context.filesDir, "preview-ready")

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
    Log.w(TAG, "preview-ready needs the New Architecture, so the selected preview is ignored and the base bundle loads")

  /** The selected preview if this app can run it, else null for the base bundle. */
  fun bundleToLoad(context: Context): File? {
    val bundle = selectedBundle(context) ?: return null
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
    host.devSupportManager?.bundleFilePath = bundleToLoad(context)?.absolutePath
  }

  /**
   * Records the choice for the next start or reload. Null clears it, so the base bundle loads. The
   * path is relative to the preview folder and must stay inside it.
   */
  fun select(context: Context, bundle: String?) {
    val root = root(context)
    val state = File(root, "state.json")
    if (bundle == null) {
      state.delete()
      return
    }
    require(File(root, bundle).canonicalPath.startsWith(root.canonicalPath + File.separator)) {
      "The bundle path must stay inside the preview folder"
    }
    root.mkdirs()
    state.writeText(JSONObject().put("bundle", bundle).toString())
  }

  /** The raw choice, for JS to show which preview is active. Empty when nothing is chosen. */
  fun read(context: Context): Map<String, Any?> =
    try {
      val state = File(root(context), "state.json")
      if (!state.isFile) {
        emptyMap()
      } else {
        val json = JSONObject(state.readText())
        mapOf("bundle" to json.optString("bundle").ifEmpty { null })
      }
    } catch (e: Exception) {
      emptyMap()
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
