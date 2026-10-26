import ExpoModulesCore
import React

/**
 Makes the app's bundle URL ask `state.json` every time React reads it: at the first start and on
 every reload. A selected preview wins; otherwise the app's own URL is used, so Metro in a debug
 build, the embedded bundle in a release build, or expo-updates' update loads exactly as without
 this package.

 React keeps the URL block it was created with, so it is swapped before the first root view exists,
 which is when this handler runs. Returning nil lets the normal root view be made with the new block.
 expo-updates is ordered ahead of every other handler and answers itself, so with it active this
 handler is not asked; the module then reloads into a selected preview once it starts
 (`startOnSelectedPreview`).
 */
public final class PreviewReadyReactDelegateHandler: ExpoReactDelegateHandler {
  private typealias BundleURLBlock = @convention(block) () -> URL?

  private static var installed = false
  private static var hopped = false
  private static weak var rootViewFactory: NSObject?
  /// What the block handed React last, to tell whether the running bundle is the selected one.
  private static var lastServed: URL?

  public override func createReactRootView(
    reactDelegate: ExpoReactDelegate,
    moduleName: String,
    initialProperties: [AnyHashable: Any]?,
    launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> UIView? {
    Self.install(factory: reactDelegate.reactNativeFactory as? NSObject)
    return nil
  }

  private static func install(factory: NSObject?) {
    if installed {
      return
    }
    // React's factory and its configuration are reached by key, the way Expo's own
    // `recreateRootView` reads `_configuration`, so this needs no header from React's app delegate pod.
    guard
      let factory,
      factory.responds(to: NSSelectorFromString("rootViewFactory")),
      let rootViewFactory = factory.value(forKey: "rootViewFactory") as? NSObject,
      let configuration = rootViewFactory.value(forKey: "_configuration") as? NSObject,
      configuration.responds(to: NSSelectorFromString("bundleURLBlock")),
      let current = configuration.value(forKey: "bundleURLBlock")
    else {
      previewReadyLog.warning("Could not reach React's bundle URL, so previews are off and the base bundle loads")
      return
    }
    Self.rootViewFactory = rootViewFactory
    let base = unsafeBitCast(current as AnyObject, to: BundleURLBlock.self)
    let block: BundleURLBlock = {
      let url = PreviewState.bundleToLoad() ?? base()
      Self.lastServed = url
      return url
    }
    configuration.setValue(block, forKey: "bundleURLBlock")
    installed = true
  }

  /**
   For an app whose start this handler did not see (expo-updates answered first): if a preview is
   selected but the base is what started, reload once into the preview. Once per process, so a
   preview that cannot load never turns into a reload loop.
   */
  static func startOnSelectedPreview() {
    // The plain lookup, not `bundleToLoad`: that would count this start as a preview start and the
    // reload below as a second one.
    guard !hopped, let preview = PreviewState.selectedBundle(), PreviewState.newArchitecture else {
      return
    }
    if installed, lastServed?.standardizedFileURL == preview.standardizedFileURL {
      return
    }
    hopped = true
    reload()
  }

  /**
   Restarts JS into the current choice. React's bundle manager reads its bundle configuration before
   anything else, and the one Expo builds deliberately says nothing for a file URL. So a preview is
   put there as React's own file configuration, and the base gets React's default one, which hands
   the choice back to the app's URL: Metro, the embedded bundle, or expo-updates' update. This works
   whether or not the block above was installed. Each step is checked, since a missing key throws.
   */
  static func reload() {
    PreviewState.nextStart()
    guard
      let host = reactHost(),
      let ivar = class_getInstanceVariable(type(of: host), "_bundleManager"),
      let manager = object_getIvar(host, ivar) as? NSObject,
      manager.responds(to: NSSelectorFromString("setBundleConfig:")),
      let configuration = bundleConfiguration(for: PreviewState.bundleToLoad())
    else {
      previewReadyLog.warning("Could not reach React's bundle manager, so the reload keeps the current bundle")
      RCTTriggerReloadCommandListeners("preview-ready: switch bundle")
      return
    }
    manager.setValue(configuration, forKey: "bundleConfig")
    RCTTriggerReloadCommandListeners("preview-ready: switch bundle")
  }

  private static func reactHost() -> NSObject? {
    var factory = rootViewFactory
    if factory == nil {
      // The handler was not asked, so find React's factory where Expo's app delegate template keeps it.
      let appDelegate = UIApplication.shared.delegate as? NSObject
      if appDelegate?.responds(to: NSSelectorFromString("reactNativeFactory")) == true,
         let reactNativeFactory = appDelegate?.value(forKey: "reactNativeFactory") as? NSObject,
         reactNativeFactory.responds(to: NSSelectorFromString("rootViewFactory")) {
        factory = reactNativeFactory.value(forKey: "rootViewFactory") as? NSObject
      }
    }
    guard let factory, factory.responds(to: NSSelectorFromString("reactHost")) else {
      return nil
    }
    return factory.value(forKey: "reactHost") as? NSObject
  }

  private static func bundleConfiguration(for preview: URL?) -> NSObject? {
    guard
      let type = NSClassFromString("RCTBundleConfiguration") as? NSObject.Type,
      type.responds(to: NSSelectorFromString("defaultConfiguration")),
      let configuration = type.perform(NSSelectorFromString("defaultConfiguration"))?.takeUnretainedValue() as? NSObject
    else {
      return nil
    }
    guard let preview else {
      return configuration
    }
    guard class_getInstanceVariable(type, "_bundleFilePath") != nil else {
      return nil
    }
    configuration.setValue(preview as NSURL, forKey: "bundleFilePath")
    return configuration
  }
}
