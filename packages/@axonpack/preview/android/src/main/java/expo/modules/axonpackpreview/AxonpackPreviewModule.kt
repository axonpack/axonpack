package expo.modules.axonpackpreview

import android.content.pm.PackageManager
import android.util.Log
import com.facebook.react.ReactApplication
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class AxonpackPreviewModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("AxonpackPreview")

    Constants(
      "compatibility" to metaData("COMPATIBILITY"),
      "key" to metaData("KEY"),
      "slug" to metaData("SLUG"),
      // For the list's header; read from the app itself so no other module is needed.
      "appName" to appInfo { it.applicationInfo.loadLabel(it.packageManager).toString() },
      "appVersion" to appInfo { it.packageManager.getPackageInfo(it.packageName, 0).versionName },
      "buildNumber" to appInfo {
        @Suppress("DEPRECATION")
        it.packageManager.getPackageInfo(it.packageName, 0).versionCode.toString()
      },
    )

    Function("select") { bundle: String?, key: String? ->
      val context = appContext.reactContext ?: return@Function
      PreviewState.select(context, bundle, key)
    }

    Function("selectLocalServer") { url: String?, hostPort: String? ->
      val context = appContext.reactContext ?: return@Function
      PreviewState.selectLocalServer(context, url, hostPort)
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
    host.reload("preview: switch bundle")
  }

  private fun appInfo(read: (android.content.Context) -> String?): String? {
    val context = appContext.reactContext ?: return null
    return try {
      read(context)
    } catch (e: Exception) {
      null
    }
  }

  /** What the config plugin wrote at prebuild; null when the plugin is not in the app config. */
  private fun metaData(name: String): String? {
    val context = appContext.reactContext ?: return null
    return try {
      context.packageManager
        .getApplicationInfo(context.packageName, PackageManager.GET_META_DATA)
        .metaData
        ?.getString("dev.axonpack.preview.$name")
    } catch (e: Exception) {
      null
    }
  }

}
