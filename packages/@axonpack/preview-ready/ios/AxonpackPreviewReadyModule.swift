import ExpoModulesCore
import React

public final class AxonpackPreviewReadyModule: Module {
  public func definition() -> ModuleDefinition {
    Name("AxonpackPreviewReady")

    Function("reload") {
      // The base is the bundle inside the app. Going back to Metro or to an expo-updates update
      // comes with the debug-build and expo-updates items.
      let url = PreviewState.selectedBundle() ?? Bundle.main.url(forResource: "main", withExtension: "jsbundle")
      DispatchQueue.main.async {
        RCTReloadCommandSetBundleURL(url)
        RCTTriggerReloadCommandListeners("preview-ready: switch bundle")
      }
    }
  }
}
