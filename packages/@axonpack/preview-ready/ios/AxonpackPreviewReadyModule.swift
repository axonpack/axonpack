import ExpoModulesCore
import React

public final class AxonpackPreviewReadyModule: Module {
  public func definition() -> ModuleDefinition {
    Name("AxonpackPreviewReady")

    Function("reload") {
      guard PreviewState.newArchitecture else {
        PreviewState.warnOldArchitecture()
        return
      }
      // The reload asks the bundle URL block again, and that block reads the current choice.
      DispatchQueue.main.async {
        RCTTriggerReloadCommandListeners("preview-ready: switch bundle")
      }
    }
  }
}
