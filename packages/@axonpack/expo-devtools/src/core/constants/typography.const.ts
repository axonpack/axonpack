import { Platform } from 'react-native';

/**
 * `monospace` is an **Android** family name. On iOS `RCTFontWithFontProperties` finds no family and
 * no font by that name and falls back to the proportional system font — silently, so every
 * monospaced block in the panel was proportional there. It only reads as a bug where columns have to
 * line up: the code frame's gutter and its caret, which is what surfaced it.
 *
 * A real family name rather than iOS's own `ui-monospace` token, because that token is only honoured
 * by the versions of React Native whose font table carries it, and Menlo ships with every iOS.
 */
export const MONOSPACE = Platform.select({ ios: 'Menlo', default: 'monospace' });
