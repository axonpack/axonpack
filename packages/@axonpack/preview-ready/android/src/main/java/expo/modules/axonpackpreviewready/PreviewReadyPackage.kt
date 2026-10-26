package expo.modules.axonpackpreviewready

import android.app.Application
import android.content.Context
import android.util.Log
import com.facebook.react.ReactApplication
import expo.modules.core.interfaces.ApplicationLifecycleListener
import expo.modules.core.interfaces.Package
import expo.modules.core.interfaces.ReactNativeHostHandler

class PreviewReadyPackage : Package {
  override fun createReactNativeHostHandlers(context: Context): List<ReactNativeHostHandler> {
    val appContext = context.applicationContext
    return listOf(
      object : ReactNativeHostHandler {
        // Asked each time the React instance is created, so a reload picks up a new choice. Null
        // leaves the start to expo-updates or the embedded bundle, exactly as without this package.
        override fun getJSBundleFile(useDeveloperSupport: Boolean): String? =
          PreviewState.bundleToLoad(appContext)?.absolutePath
      }
    )
  }

  override fun createApplicationLifecycleListeners(context: Context): List<ApplicationLifecycleListener> =
    listOf(
      object : ApplicationLifecycleListener {
        // Runs before any activity starts React, so the first start already gets the preview. Only
        // touches the host when a preview is selected, so an app without one starts as it always did.
        override fun onCreate(application: Application) {
          if (PreviewState.bundleToLoad(application) == null) return
          try {
            val host = (application as? ReactApplication)?.reactHost
            PreviewState.pointDevSupport(application, host)
            BundleLoaderOverride.apply(application, host)
          } catch (e: Exception) {
            Log.w(TAG, "Could not point the start at the selected preview, the base bundle loads", e)
          }
        }
      }
    )
}
