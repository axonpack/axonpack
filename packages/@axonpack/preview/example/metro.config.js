const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
const libRoot = path.resolve(__dirname, '..');

// Load the library from src/ through its `expo-source` export, so a JS change shows on reload with
// no build step.
config.resolver.unstable_conditionNames = [
  ...config.resolver.unstable_conditionNames,
  'expo-source',
];

// The workspace install gives the library its own copy of react, react-native and the Expo
// modules. Two copies in one bundle break hooks and native modules, so anything the library imports
// is resolved from this app instead.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const fromLib =
    context.originModulePath.startsWith(libRoot + path.sep) &&
    !context.originModulePath.startsWith(__dirname + path.sep) &&
    !moduleName.startsWith('.');
  const origin = fromLib ? path.join(__dirname, 'index.ts') : context.originModulePath;
  return context.resolveRequest({ ...context, originModulePath: origin }, moduleName, platform);
};

module.exports = config;
