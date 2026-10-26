package expo.modules.axonpackpreviewready

import android.content.pm.PackageManager
import android.util.Log
import com.facebook.react.ReactApplication
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class AxonpackPreviewReadyModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("AxonpackPreviewReady")

    Constants(
      "compatibility" to metaData("COMPATIBILITY"),
      "key" to metaData("KEY"),
      "slug" to metaData("SLUG"),
    )

    Function("select") { bundle: String?, key: String? ->
      val context = appContext.reactContext ?: return@Function
      PreviewState.select(context, bundle, key)
    }

    Function("state") {
      appContext.reactContext?.let { PreviewState.read(it) } ?: emptyMap<String, Any?>()
    }

    Function("markLaunched") {
      appContext.reactContext?.let { PreviewState.confirmStart(it) }
    }

    Function("reload") { reload() }
  }

  private fun reload() {
    val app = appContext.reactContext?.applicationContext as? ReactApplication
    if (app == null) {
      Log.w(TAG, "The application is not a ReactApplication, so there is nothing to reload")
      return
    }
    val host = app.reactHost
    if (host == null || !PreviewState.newArchitecture()) {
      PreviewState.warnOldArchitecture()
      return
    }
    PreviewState.nextStart()
    appContext.reactContext?.let {
      PreviewState.pointDevSupport(it, host)
      BundleLoaderOverride.apply(it, host)
    }
    host.reload("preview-ready: switch bundle")
  }

  /** What the config plugin wrote at prebuild; null when the plugin is not in the app config. */
  private fun metaData(name: String): String? {
    val context = appContext.reactContext ?: return null
    return try {
      context.packageManager
        .getApplicationInfo(context.packageName, PackageManager.GET_META_DATA)
        .metaData
        ?.getString("dev.axonpack.preview-ready.$name")
    } catch (e: Exception) {
      null
    }
  }

}
