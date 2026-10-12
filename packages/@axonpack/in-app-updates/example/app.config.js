// The stores only know your own published app, so to see a real answer from them, run the example
// as one: APP_ID=com.your.app APP_VERSION=1.0.0 bun run ios
module.exports = ({ config }) => {
  const id = process.env.APP_ID;
  const version = process.env.APP_VERSION;
  return {
    ...config,
    version: version ?? config.version,
    ios: { ...config.ios, bundleIdentifier: id ?? config.ios.bundleIdentifier },
    android: { ...config.android, package: id ?? config.android.package },
  };
};
