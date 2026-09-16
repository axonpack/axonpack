const { getDefaultConfig } = require("expo/metro-config");
const {
  withDevtoolsTab,
} = require("@axonpack/react-native-devtools-tab/metro");

module.exports = withDevtoolsTab(getDefaultConfig(__dirname));
