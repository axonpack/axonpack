package expo.modules.axonpackpreviewready

import android.app.Application
import android.content.Context
import android.content.Intent
import android.os.Handler
import android.os.Looper
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

        // Expo hands JS errors to the host handlers and only throws itself when there are none, so
        // this handler decides. A preview that failed while starting goes back to the base bundle
        // right away; anything else is thrown again, so the app fails exactly as it would without
        // this package.
        override fun onReactInstanceException(useDeveloperSupport: Boolean, exception: Exception) {
          if (!PreviewState.failStart(appContext)) throw exception
          val host = (appContext as? ReactApplication)?.reactHost
          // React tears the host and its screens down after reporting the error, so a reload would
          // leave nothing on screen. Starting the app's own activity again brings up a fresh one,
          // and with the preview cleared that start is the base bundle.
          Handler(Looper.getMainLooper()).post {
            PreviewState.nextStart()
            PreviewState.pointDevSupport(appContext, host)
            BundleLoaderOverride.apply(appContext, host)
            val launch = appContext.packageManager.getLaunchIntentForPackage(appContext.packageName)
            if (launch != null) {
              launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK)
              appContext.startActivity(launch)
            } else {
              host?.reload("preview-ready: the preview failed while starting")
            }
          }
        }
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
