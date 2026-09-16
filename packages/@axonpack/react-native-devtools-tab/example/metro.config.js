const { getDefaultConfig } = require("expo/metro-config");
const {
  withReactNativeDevtoolsPanel,
} = require("@axonpack/react-native-devtools-tab/metro");

module.exports = withReactNativeDevtoolsPanel(getDefaultConfig(__dirname));
