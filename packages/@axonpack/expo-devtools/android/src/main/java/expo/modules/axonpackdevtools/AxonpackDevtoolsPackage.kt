package expo.modules.axonpackdevtools

import android.app.Application
import android.content.Context
import expo.modules.core.interfaces.ApplicationLifecycleListener
import expo.modules.core.interfaces.Package

/**
 * Exists for one reason: something has to run before React Native builds its HTTP client, and a
 * module cannot — by the time JavaScript calls into it, the client it wanted to stand in front of has
 * usually been built already. Autolinking finds this class by its name and its import, and Expo's own
 * `ApplicationLifecycleDispatcher` calls it from the application's `onCreate`.
 */
class AxonpackDevtoolsPackage : Package {
  override fun createApplicationLifecycleListeners(
    context: Context?
  ): List<ApplicationLifecycleListener> = listOf(NetworkTimingInstaller())
}

private class NetworkTimingInstaller : ApplicationLifecycleListener {
  override fun onCreate(application: Application) {
    NetworkPhaseReporter.install()
  }
}
