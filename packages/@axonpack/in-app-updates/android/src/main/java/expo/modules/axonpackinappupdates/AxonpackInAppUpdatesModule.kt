package expo.modules.axonpackinappupdates

import com.google.android.play.core.appupdate.AppUpdateInfo
import com.google.android.play.core.appupdate.AppUpdateManager
import com.google.android.play.core.appupdate.AppUpdateManagerFactory
import com.google.android.play.core.appupdate.AppUpdateOptions
import com.google.android.play.core.install.InstallStateUpdatedListener
import com.google.android.play.core.install.model.AppUpdateType
import com.google.android.play.core.install.model.UpdateAvailability
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Google Play's in-app update flow. Play only answers for an app installed from Play (internal app
 * sharing counts), so on a sideloaded or debug build the info call fails and JS falls back to the
 * store link.
 */
class AxonpackInAppUpdatesModule : Module() {
  private var manager: AppUpdateManager? = null
  private var lastInfo: AppUpdateInfo? = null

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

  private fun updateManager(): AppUpdateManager {
    manager?.let { return it }
    val context = appContext.reactContext ?: throw Exceptions.ReactContextLost()
    return AppUpdateManagerFactory.create(context).also {
      it.registerListener(installListener)
      manager = it
    }
  }

  override fun definition() = ModuleDefinition {
    Name("AxonpackInAppUpdates")

    Events("onInstallStatus")

    OnDestroy {
      manager?.unregisterListener(installListener)
      manager = null
    }

    AsyncFunction("getUpdateInfo") { promise: Promise ->
      updateManager().appUpdateInfo
        .addOnSuccessListener { info ->
          lastInfo = info
          promise.resolve(
            mapOf(
              "available" to (info.updateAvailability() == UpdateAvailability.UPDATE_AVAILABLE),
              // An immediate update the user started earlier and left. It must be resumed.
              "inProgress" to (info.updateAvailability() == UpdateAvailability.DEVELOPER_TRIGGERED_UPDATE_IN_PROGRESS),
              "availableVersionCode" to info.availableVersionCode(),
              "updatePriority" to info.updatePriority(),
              "stalenessDays" to info.clientVersionStalenessDays(),
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
      val info = lastInfo
      val activity = appContext.currentActivity
      if (info == null || activity == null) {
        promise.reject("ERR_IN_APP_UPDATE_STATE", "Call getUpdateInfo first, with an activity in the foreground.", null)
        return@AsyncFunction
      }
      val type = if (immediate) AppUpdateType.IMMEDIATE else AppUpdateType.FLEXIBLE
      updateManager()
        .startUpdateFlow(info, activity, AppUpdateOptions.newBuilder(type).build())
        .addOnSuccessListener { promise.resolve(it) }
        .addOnFailureListener { promise.reject("ERR_IN_APP_UPDATE_START", it.message, it) }
    }

    // Installs a flexible update once its download has finished, and restarts the app.
    AsyncFunction("completeUpdate") { promise: Promise ->
      updateManager().completeUpdate()
        .addOnSuccessListener { promise.resolve(null) }
        .addOnFailureListener { promise.reject("ERR_IN_APP_UPDATE_COMPLETE", it.message, it) }
    }
  }
}
