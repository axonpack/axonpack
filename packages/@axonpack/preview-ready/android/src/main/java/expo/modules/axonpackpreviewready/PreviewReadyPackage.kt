package expo.modules.axonpackpreviewready

import android.content.Context
import expo.modules.core.interfaces.Package
import expo.modules.core.interfaces.ReactNativeHostHandler

class PreviewReadyPackage : Package {
  override fun createReactNativeHostHandlers(context: Context): List<ReactNativeHostHandler> {
    val appContext = context.applicationContext
    return listOf(
      object : ReactNativeHostHandler {
        // Asked each time the React instance is created, so a reload picks up a new choice. Null
        // leaves the start to expo-updates or the embedded bundle, exactly as without this package.
        override fun getJSBundleFile(useDeveloperSupport: Boolean): String? {
          val bundle = PreviewState.selectedBundle(appContext) ?: return null
          if (!PreviewState.newArchitecture()) {
            PreviewState.warnOldArchitecture()
            return null
          }
          return bundle.absolutePath
        }
      }
    )
  }
}
