import type { MaterialIconName } from '../../components/ui/icon-button.ui';
import type { CrashKind } from '../../stores/crash/crash.store';
import type { Palette } from '../theme.const';

export type CrashKindVisual = {
  icon: MaterialIconName;
  color: string;
};

/**
 * Takes the palette rather than closing over one, for the same reason every other colour-returning
 * helper in this package does: a module-level colour can't follow a theme change.
 */
export function getCrashKindVisual(kind: CrashKind, COLORS: Palette): CrashKindVisual {
  switch (kind) {
    case 'js-fatal':
      return { icon: 'dangerous', color: COLORS.error };
    case 'native-exception':
      return { icon: 'memory', color: COLORS.error };
    case 'react-render':
      return { icon: 'broken-image', color: COLORS.error };
    case 'unhandled-rejection':
      return { icon: 'link-off', color: COLORS.warning };
    case 'js-error':
    default:
      return { icon: 'error-outline', color: COLORS.warning };
  }
}
