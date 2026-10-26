package expo.modules.axonpackpreviewready

import android.content.Context
import android.util.Log
import com.facebook.react.ReactHost
import com.facebook.react.bridge.JSBundleLoader

/**
 * expo-updates is asked for the bundle before this package, and once it has applied a downloaded
 * update it always answers. So with expo-updates installed, the selected preview is also put
 * straight into the host, in the same private field expo-dev-launcher replaces. Clearing it hands the
 * start back to expo-updates. If the field is not there (another SDK, a minified build without the
 * keep rule), the base bundle loads and a warning says why. It never throws.
 */
internal object BundleLoaderOverride {
  private val expoUpdatesInstalled: Boolean by lazy {
    try {
      Class.forName("expo.modules.updates.UpdatesPackage")
      true
    } catch (e: ClassNotFoundException) {
      false
    }
  }

  fun apply(context: Context, host: ReactHost?) {
    if (!expoUpdatesInstalled || host == null) return
    val bundle = PreviewState.bundleToLoad(context)
    try {
      val delegate = host.javaClass.getDeclaredField("reactHostDelegate")
        .apply { isAccessible = true }
        .get(host) ?: return
      delegate.javaClass.getDeclaredField("_jsBundleLoader")
        .apply { isAccessible = true }
        .set(delegate, bundle?.let { JSBundleLoader.createFileLoader(it.absolutePath) })
    } catch (e: Exception) {
      if (bundle != null) {
        Log.w(TAG, "Could not put the preview ahead of expo-updates, so the base bundle loads", e)
      }
    }
  }
}
