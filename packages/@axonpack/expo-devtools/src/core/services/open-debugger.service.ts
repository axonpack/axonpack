import { TurboModuleRegistry } from 'react-native';
// Type-only, so nothing of this private path survives compilation into the bundle.
import type { TurboModule } from 'react-native/Libraries/TurboModule/RCTExport';

/**
 * React Native's own `DevSettings` native module, looked up by name for the same reason
 * `patch-websocket.service.ts` does: its spec lives under a private path. `openDebugger` is what the
 * dev menu's "Open DevTools" calls, so this asks Metro for the same window with the same device id,
 * which JS has no way to work out for itself. Optional, because older versions do not have it.
 */
type NativeDevSettings = TurboModule & { openDebugger?: () => void };

// Ours first: an intersection's call signatures resolve in order, and TurboModule's returns `{}`.
type NativeSourceCode = { getConstants: () => { scriptURL?: string | null } } & TurboModule;

// A release build compiles the native side to a no-op, so a button there would press to nothing.
const devSettings = __DEV__ ? TurboModuleRegistry.get<NativeDevSettings>('DevSettings') : null;

/**
 * Where this bundle was loaded from. A bundle served by Metro comes over http; one embedded in the
 * app is a file URL, and then there is no server for DevTools to open from even in a debug build.
 */
function servedByMetro(): boolean {
  try {
    const url = TurboModuleRegistry.get<NativeSourceCode>('SourceCode')?.getConstants().scriptURL;
    return typeof url === 'string' && /^https?:\/\//.test(url);
  } catch {
    return false;
  }
}

export const canOpenDebugger = typeof devSettings?.openDebugger === 'function' && servedByMetro();

export function openDebugger() {
  if (!devSettings?.openDebugger) return;

  // Loaded here rather than imported: the tab is only registered in a debug build, and this only
  // runs in one. Optional because a tab package older than `focus` returns nothing from
  // `registerTab`, and then the window simply opens where DevTools chooses.
  const { axonpackTab } =
    require('../../devtools-remote-tab/services/register-tab.service') as typeof import('../../devtools-remote-tab/services/register-tab.service');
  axonpackTab?.focus?.();

  devSettings.openDebugger();
}
