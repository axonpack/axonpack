import ExpoModulesCore
import React

/**
 Makes the app's bundle URL ask `state.json` every time React reads it: at the first start and on
 every reload. A selected preview wins; otherwise the app's own URL is used, so Metro in a debug
 build and the embedded bundle in a release build load exactly as without this package.

 React keeps the URL block it was created with, so it has to be swapped before the first root view
 exists, which is when this runs. Returning nil lets the normal root view be made with the new block.
 expo-updates is ordered ahead of every other handler, so while it is active this one is not asked.
 */
public final class PreviewReadyReactDelegateHandler: ExpoReactDelegateHandler {
  private static var installed = false

  public override func createReactRootView(
    reactDelegate: ExpoReactDelegate,
    moduleName: String,
    initialProperties: [AnyHashable: Any]?,
    launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> UIView? {
    if !Self.installed {
      Self.installed = Self.installBundleURLBlock(reactDelegate)
    }
    return nil
  }

  private typealias BundleURLBlock = @convention(block) () -> URL?

  private static func installBundleURLBlock(_ reactDelegate: ExpoReactDelegate) -> Bool {
    // React's factory and its configuration are reached by key, the way Expo's own
    // `recreateRootView` reads `_configuration`, so this needs no header from React's app delegate pod.
    guard
      let factory = reactDelegate.reactNativeFactory as? NSObject,
      factory.responds(to: NSSelectorFromString("rootViewFactory")),
      let rootViewFactory = factory.value(forKey: "rootViewFactory") as? NSObject,
      let configuration = rootViewFactory.value(forKey: "_configuration") as? NSObject,
      configuration.responds(to: NSSelectorFromString("bundleURLBlock")),
      let current = configuration.value(forKey: "bundleURLBlock")
    else {
      previewReadyLog.warning("Could not reach React's bundle URL, so previews are off and the base bundle loads")
      return false
    }
    let base = unsafeBitCast(current as AnyObject, to: BundleURLBlock.self)
    let block: BundleURLBlock = {
      guard let preview = PreviewState.selectedBundle() else {
        return base()
      }
      guard PreviewState.newArchitecture else {
        PreviewState.warnOldArchitecture()
        return base()
      }
      return preview
    }
    configuration.setValue(block, forKey: "bundleURLBlock")
    return true
  }
}
