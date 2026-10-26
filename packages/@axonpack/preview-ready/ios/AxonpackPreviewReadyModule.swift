import ExpoModulesCore
import React

public final class AxonpackPreviewReadyModule: Module {
  public func definition() -> ModuleDefinition {
    Name("AxonpackPreviewReady")

    // What the config plugin wrote at prebuild; nil when the plugin is not in the app config.
    Constants([
      "fingerprint": Bundle.main.object(forInfoDictionaryKey: "AxonpackPreviewReadyFingerprint") as? String
    ])

    OnCreate {
      DispatchQueue.main.async {
        PreviewReadyReactDelegateHandler.startOnSelectedPreview()
      }
    }

    Function("select") { (bundle: String?) in
      try PreviewState.select(bundle)
    }

    Function("reload") {
      guard PreviewState.newArchitecture else {
        PreviewState.warnOldArchitecture()
        return
      }
      // The reload asks the bundle URL block again, and that block reads the current choice.
      DispatchQueue.main.async {
        PreviewReadyReactDelegateHandler.reload()
      }
    }
  }
}

final class PreviewPathOutsideException: Exception {
  override var reason: String {
    "The bundle path must stay inside the preview folder"
  }
}
