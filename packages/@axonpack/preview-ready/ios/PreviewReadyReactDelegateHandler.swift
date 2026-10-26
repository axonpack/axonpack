import ExpoModulesCore

/**
 Starts the app from the selected preview. Returning nil leaves the start to expo-updates or the
 embedded bundle, exactly as without this package. expo-updates is ordered ahead of every other
 handler, so while it is active it answers first and this one is not asked.
 */
public final class PreviewReadyReactDelegateHandler: ExpoReactDelegateHandler {
  public override func createReactRootView(
    reactDelegate: ExpoReactDelegate,
    moduleName: String,
    initialProperties: [AnyHashable: Any]?,
    launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> UIView? {
    guard let bundle = PreviewState.selectedBundle() else {
      return nil
    }
    return reactDelegate.reactNativeFactory.recreateRootView(
      withBundleURL: bundle,
      moduleName: moduleName,
      initialProps: initialProperties,
      launchOptions: launchOptions
    )
  }
}
