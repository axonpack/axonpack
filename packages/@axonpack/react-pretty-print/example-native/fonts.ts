import { Platform } from 'react-native';

/**
 * `monospace` is an Android family name. iOS finds no font by it and falls back to the proportional
 * system font without a word, which stays invisible until something has to line up. The package
 * ships `monospace` in every palette because it imports no platform and cannot make this choice —
 * so a React Native caller makes it, once, here.
 */
export const MONOSPACE = Platform.select({ ios: 'Menlo', default: 'monospace' });
