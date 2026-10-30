import ExpoModulesCore
import React

public final class AxonpackPreviewModule: Module {
  private lazy var bonjour = BonjourBrowser { [weak self] services in
    self?.sendEvent("onBonjourServices", ["services": services])
  }

  public func definition() -> ModuleDefinition {
    Name("AxonpackPreview")

    Events("onBonjourServices")

    // What the config plugin wrote at prebuild; nil when the plugin is not in the app config.
    Constants([
      "compatibility": Bundle.main.object(forInfoDictionaryKey: "AxonpackPreviewCompatibility") as? String,
      "key": Bundle.main.object(forInfoDictionaryKey: "AxonpackPreviewKey") as? String,
      "slug": Bundle.main.object(forInfoDictionaryKey: "AxonpackPreviewSlug") as? String,
      // For the list's header; read from the app itself so no other module is needed.
      "appName": (Bundle.main.object(forInfoDictionaryKey: "CFBundleDisplayName") ?? Bundle.main.object(forInfoDictionaryKey: "CFBundleName")) as? String,
      "appVersion": Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String,
      "buildNumber": Bundle.main.object(forInfoDictionaryKey: "CFBundleVersion") as? String
    ])

    OnCreate {
      DispatchQueue.main.async {
        PreviewReactDelegateHandler.startOnSelectedPreview()
      }
    }

    Function("select") { (bundle: String?, key: String?) in
      try PreviewState.select(bundle, key: key)
    }

    // `hostPort` is what Android needs; iOS loads the bundle URL itself.
    Function("selectLocalServer") { (url: String?, _: String?) in
      PreviewState.selectLocalServer(url)
    }

    Function("state") {
      PreviewState.read()
    }

    Function("markLaunched") {
      PreviewState.confirmStart()
    }

    // While the dev preview servers list is on screen, and never in the background.
    Function("startBonjourBrowse") {
      self.bonjour.start()
    }

    Function("stopBonjourBrowse") {
      self.bonjour.stop()
    }

    OnDestroy {
      self.bonjour.stop()
    }

    Function("reload") {
      guard PreviewState.newArchitecture else {
        PreviewState.warnOldArchitecture()
        return
      }
      // The reload asks the bundle URL block again, and that block reads the current choice.
      DispatchQueue.main.async {
        PreviewReactDelegateHandler.reload()
      }
    }
  }
}

final class PreviewPathOutsideException: Exception {
  override var reason: String {
    "The bundle path must stay inside the preview folder"
  }
}
