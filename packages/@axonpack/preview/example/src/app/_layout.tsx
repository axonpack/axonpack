import { PreviewProvider } from "@axonpack/preview";
import { DarkTheme, DefaultTheme, ThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useColorScheme, View } from "react-native";

import { AnimatedSplashOverlay } from "@/components/animated-icon";
import AppTabs from "@/components/app-tabs";
import { BundleBanner } from "@/components/bundle-banner";
import { bundleLabel, previewConfig } from "@/preview-config";

// Lets you try the crash fallback: a preview published with this label throws while it loads.
if (bundleLabel === "crash-on-start") {
  throw new Error("This preview crashes on purpose");
}

SplashScreen.preventAutoHideAsync();

export default function TabLayout() {
  const colorScheme = useColorScheme();
  return (
    <PreviewProvider config={previewConfig}>
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <AnimatedSplashOverlay />
        <View style={{ flex: 1 }}>
          <BundleBanner />
          <AppTabs />
        </View>
      </ThemeProvider>
    </PreviewProvider>
  );
}
