package expo.modules.axonpackinappupdates

import android.content.pm.ApplicationInfo
import android.os.Handler
import android.os.Looper
import com.google.android.play.core.appupdate.AppUpdateManager
import com.google.android.play.core.appupdate.AppUpdateManagerFactory
import com.google.android.play.core.appupdate.AppUpdateOptions
import com.google.android.play.core.appupdate.testing.FakeAppUpdateManager
import com.google.android.play.core.install.InstallStateUpdatedListener
import com.google.android.play.core.install.model.AppUpdateType
import com.google.android.play.core.install.model.InstallStatus
import com.google.android.play.core.install.model.UpdateAvailability
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Google Play's in-app update flow. Play only answers for an app installed from Play (internal app
 * sharing counts), so on a sideloaded or debug build the info call fails and JS falls back to the
 * store link.
 *
 * For development there is a fake Play, switched on from JS. It works only in a debuggable build, so
 * a release build can never use it.
 */
class AxonpackInAppUpdatesModule : Module() {
  private var real: AppUpdateManager? = null
  private var fake: FakeAppUpdateManager? = null
  private var fakeScenario: String? = null
  private val main = Handler(Looper.getMainLooper())

  // A second start while one is running would use up the same update info, so it is refused.
  private var starting = false

  private val installListener = InstallStateUpdatedListener { state ->
    sendEvent(
      "onInstallStatus",
      mapOf(
        "status" to state.installStatus(),
        "bytesDownloaded" to state.bytesDownloaded(),
        "totalBytesToDownload" to state.totalBytesToDownload(),
        "errorCode" to state.installErrorCode()
      )
    )
  }

  private fun context() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  private fun isDebuggable() =
    (context().applicationInfo.flags and ApplicationInfo.FLAG_DEBUGGABLE) != 0

  private fun manager(): AppUpdateManager {
    fake?.let { return it }
    real?.let { return it }
    return AppUpdateManagerFactory.create(context()).also {
      it.registerListener(installListener)
      real = it
    }
  }

  override fun definition() = ModuleDefinition {
    Name("AxonpackInAppUpdates")

    Events("onInstallStatus")

    OnDestroy {
      real?.unregisterListener(installListener)
      fake?.unregisterListener(installListener)
      real = null
      fake = null
    }

    AsyncFunction("getUpdateInfo") { promise: Promise ->
      manager().appUpdateInfo
        .addOnSuccessListener { info ->
          promise.resolve(
            mapOf(
              "available" to (info.updateAvailability() == UpdateAvailability.UPDATE_AVAILABLE),
              // An immediate update the user started and left. It must be resumed.
              "inProgress" to (info.updateAvailability() == UpdateAvailability.DEVELOPER_TRIGGERED_UPDATE_IN_PROGRESS),
              "availableVersionCode" to info.availableVersionCode(),
              "updatePriority" to info.updatePriority(),
              "stalenessDays" to info.clientVersionStalenessDays(),
              // DOWNLOADED means a flexible update finished downloading and waits to be installed.
              "installStatus" to info.installStatus(),
              "flexibleAllowed" to info.isUpdateTypeAllowed(AppUpdateType.FLEXIBLE),
              "immediateAllowed" to info.isUpdateTypeAllowed(AppUpdateType.IMMEDIATE)
            )
          )
        }
        .addOnFailureListener { promise.reject("ERR_IN_APP_UPDATE_INFO", it.message, it) }
    }

    // Resolves with the activity result code: -1 accepted, 0 declined, 1 Play failed.
    AsyncFunction("startUpdate") { immediate: Boolean, promise: Promise ->
      val activity = appContext.currentActivity
      if (activity == null) {
        promise.reject("ERR_IN_APP_UPDATE_STATE", "No activity is in the foreground.", null)
        return@AsyncFunction
      }
      if (starting) {
        promise.reject("ERR_IN_APP_UPDATE_BUSY", "An update is already starting.", null)
        return@AsyncFunction
      }
      starting = true
      val manager = manager()
      val type = if (immediate) AppUpdateType.IMMEDIATE else AppUpdateType.FLEXIBLE
      // Play allows one start per AppUpdateInfo, so a fresh one is asked for every time.
      manager.appUpdateInfo
        .addOnSuccessListener { info ->
          manager
            .startUpdateFlow(info, activity, AppUpdateOptions.newBuilder(type).build())
            .addOnSuccessListener { code ->
              starting = false
              promise.resolve(code)
            }
            .addOnFailureListener {
              starting = false
              promise.reject("ERR_IN_APP_UPDATE_START", it.message, it)
            }
          fake?.let { playUser(it, immediate) }
        }
        .addOnFailureListener {
          starting = false
          promise.reject("ERR_IN_APP_UPDATE_INFO", it.message, it)
        }
    }

    // Installs a flexible update once its download has finished, and restarts the app.
    AsyncFunction("completeUpdate") { promise: Promise ->
      val manager = manager()
      manager.completeUpdate()
        .addOnSuccessListener { promise.resolve(null) }
        .addOnFailureListener { promise.reject("ERR_IN_APP_UPDATE_COMPLETE", it.message, it) }
      // The real call restarts the app. The fake has no app to restart, so it only reports INSTALLED.
      fake?.let { f -> main.postDelayed({ if (f.isInstallSplashScreenVisible) f.installCompletes() }, 300) }
    }

    // Development only. A scenario name turns the fake Play on, null turns it off again.
    AsyncFunction("setFakeScenario") { scenario: String?, promise: Promise ->
      if (!isDebuggable()) {
        promise.reject("ERR_IN_APP_UPDATE_FAKE", "The fake Play only works in a debuggable build.", null)
        return@AsyncFunction
      }
      fake?.unregisterListener(installListener)
      if (scenario == null) {
        fake = null
        fakeScenario = null
        promise.resolve(null)
        return@AsyncFunction
      }
      val f = FakeAppUpdateManager(context())
      f.registerListener(installListener)
      fake = f
      fakeScenario = scenario
      if (scenario == "unavailable") {
        f.setUpdateNotAvailable()
        promise.resolve(null)
        return@AsyncFunction
      }
      f.setUpdateAvailable(FAKE_VERSION_CODE)
      f.setClientVersionStalenessDays(3)
      f.setUpdatePriority(2)
      f.setTotalBytesToDownload(FAKE_TOTAL_BYTES)
      when (scenario) {
        "downloadedOnLaunch" -> startedBefore(f, immediate = false, promise = promise)
        "inProgress" -> startedBefore(f, immediate = true, promise = promise)
        else -> promise.resolve(null)
      }
    }
  }

  /** Puts the fake in the state it would be in after an earlier run of the app started an update. */
  private fun startedBefore(f: FakeAppUpdateManager, immediate: Boolean, promise: Promise) {
    val activity = appContext.currentActivity
    if (activity == null) {
      promise.reject("ERR_IN_APP_UPDATE_STATE", "No activity is in the foreground.", null)
      return
    }
    val type = if (immediate) AppUpdateType.IMMEDIATE else AppUpdateType.FLEXIBLE
    f.appUpdateInfo.addOnSuccessListener { info ->
      f.startUpdateFlow(info, activity, AppUpdateOptions.newBuilder(type).build())
      f.userAcceptsUpdate()
      if (!immediate) {
        f.setBytesDownloaded(FAKE_TOTAL_BYTES)
        f.downloadStarts()
        f.downloadCompletes()
      }
      promise.resolve(null)
    }
  }

  /** Plays the part of the user and of Play for the chosen scenario, after the flow has started. */
  private fun playUser(f: FakeAppUpdateManager, immediate: Boolean) {
    fun after(ms: Long, step: () -> Unit) = main.postDelayed({ step() }, ms)
    when (fakeScenario) {
      "declined" -> after(400) { f.userRejectsUpdate() }
      "failed" -> after(400) {
        f.userAcceptsUpdate()
        after(300) {
          f.downloadStarts()
          after(300) { f.downloadFails() }
        }
      }
      "flexibleAccepted", "immediateAccepted" -> after(400) {
        f.userAcceptsUpdate()
        after(300) {
          f.setBytesDownloaded(FAKE_TOTAL_BYTES / 4)
          f.downloadStarts()
          // Progress between the first and last state, so a progress bar has something to show.
          after(400) { progress(f, FAKE_TOTAL_BYTES / 2) }
          after(800) { progress(f, FAKE_TOTAL_BYTES * 3 / 4) }
          after(1200) {
            f.setBytesDownloaded(FAKE_TOTAL_BYTES)
            f.downloadCompletes()
            // An immediate update installs by itself, then Play restarts the app.
            if (immediate) after(300) { f.installCompletes() }
          }
        }
      }
    }
  }

  private fun progress(f: FakeAppUpdateManager, bytes: Long) {
    f.setBytesDownloaded(bytes)
    sendEvent(
      "onInstallStatus",
      mapOf(
        "status" to InstallStatus.DOWNLOADING,
        "bytesDownloaded" to bytes,
        "totalBytesToDownload" to FAKE_TOTAL_BYTES,
        "errorCode" to 0
      )
    )
  }

  private companion object {
    const val FAKE_VERSION_CODE = 9
    const val FAKE_TOTAL_BYTES = 40_000_000L
  }
}
