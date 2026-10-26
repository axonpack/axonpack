package expo.modules.axonpackpreviewready

import android.util.Log
import com.facebook.react.ReactApplication
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class AxonpackPreviewReadyModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("AxonpackPreviewReady")

    Function("select") { bundle: String? ->
      val context = appContext.reactContext ?: return@Function
      PreviewState.select(context, bundle)
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
    appContext.reactContext?.let {
      PreviewState.pointDevSupport(it, host)
      BundleLoaderOverride.apply(it, host)
    }
    host.reload("preview-ready: switch bundle")
  }
}
