# preview-ready reaches these by name to put a preview ahead of expo-updates (BundleLoaderOverride.kt).
-keepclassmembers class com.facebook.react.runtime.ReactHostImpl { *** reactHostDelegate; }
-keepclassmembers class expo.modules.ExpoReactHostFactory$ExpoReactHostDelegate { *** _jsBundleLoader; }
