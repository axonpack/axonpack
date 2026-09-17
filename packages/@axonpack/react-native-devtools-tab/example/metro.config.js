const { getDefaultConfig } = require("expo/metro-config");
const {
  withReactNativeDevtoolsTab,
} = require("@axonpack/react-native-devtools-tab/metro");

module.exports = withReactNativeDevtoolsTab(getDefaultConfig(__dirname));
