import type { MaterialIconName } from '../../../core/components/ui/icon-button.ui';
import type { Palette } from '../../../core/constants/theme.const';

export type ActionVisual = { icon: MaterialIconName; color: string };

/**
 * An icon and a colour per kind of move, keyed by the action type React Navigation dispatches.
 * Forward moves take the accent, backward ones the muted text colour, and the ones that rewrite
 * the stack rather than extend it take the warning colour, so a glance down the list says which
 * way the app went. A type not listed, a custom action say, gets the tab's own icon.
 */
export function actionVisual(action: string, COLORS: Palette): ActionVisual {
  switch (action) {
    case 'INITIAL':
      return { icon: 'flag', color: COLORS.accent };
    case 'NAVIGATE':
    case 'PUSH':
    case 'PRELOAD':
      return { icon: 'arrow-forward', color: COLORS.accent };
    case 'GO_BACK':
    case 'POP':
    case 'POP_TO':
    case 'POP_TO_TOP':
      return { icon: 'arrow-back', color: COLORS.textSecondary };
    case 'JUMP_TO':
      return { icon: 'tab', color: COLORS.accent };
    case 'REPLACE':
      return { icon: 'swap-horiz', color: COLORS.warning };
    case 'RESET':
      return { icon: 'restart-alt', color: COLORS.warning };
    case 'SET_PARAMS':
      return { icon: 'tune', color: COLORS.textSecondary };
    case 'UNKNOWN':
      return { icon: 'help-outline', color: COLORS.textSecondary };
    default:
      return { icon: 'alt-route', color: COLORS.textSecondary };
  }
}
