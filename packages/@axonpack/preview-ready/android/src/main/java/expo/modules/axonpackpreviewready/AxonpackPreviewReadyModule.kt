package expo.modules.axonpackpreviewready

import android.os.Handler
import android.os.Looper
import com.facebook.react.ReactApplication
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class AxonpackPreviewReadyModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("AxonpackPreviewReady")

    Function("reload") { reload() }
  }

  private fun reload() {
    val app = appContext.reactContext?.applicationContext as? ReactApplication
      ?: throw CodedException("ERR_PREVIEW_READY_NO_APP", "The application is not a ReactApplication", null)
    val host = app.reactHost
    if (host != null) {
      host.reload("preview-ready: switch bundle")
      return
    }
    // The old architecture (SDK 53 and 54 with the new one turned off). Not tested here.
    Handler(Looper.getMainLooper()).post {
      @Suppress("DEPRECATION")
      app.reactNativeHost.reactInstanceManager.recreateReactContextInBackground()
    }
  }
}
