const { getDefaultConfig } = require("expo/metro-config");
const {
  withReactNativeDevtoolsPanel,
} = require("@axonpack/react-native-devtools-tab/metro");

const { withExecExperiment } = require("./exec-experiment");

module.exports = withExecExperiment(
  withReactNativeDevtoolsPanel(getDefaultConfig(__dirname)),
);
