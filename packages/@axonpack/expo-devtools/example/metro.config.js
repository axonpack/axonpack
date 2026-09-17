const { getDefaultConfig } = require('expo/metro-config');
const { withDevtools } = require('@axonpack/expo-devtools/metro');

module.exports = withDevtools(getDefaultConfig(__dirname));
