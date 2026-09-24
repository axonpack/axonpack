export type LimiterTarget = 'js' | 'main';

export const LIMITER_PRESETS_MS = [100, 250, 500, 1000, 3000];

/**
 * Names the package rather than the tab it was pressed on. This string becomes the crash record's
 * message and outlives the UI around it. It read "Crash from the devtools Limiter" until the Limiter
 * stopped being a tab, and whoever reads it in a bug report cares that the devtools caused it, not
 * where the button happened to live that release.
 */
export const LIMITER_CRASH_MESSAGE = 'Deliberate crash from @axonpack/expo-devtools';
