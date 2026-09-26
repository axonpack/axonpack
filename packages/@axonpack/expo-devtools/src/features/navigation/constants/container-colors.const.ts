import type { Palette } from '../../../core/constants/theme.const';

/** Hues far enough apart to tell tracks apart at a glance, and readable on light and dark alike. */
const TRACK_HUES = ['#e8710a', '#9334e6', '#0f9d58', '#d93025', '#1a73e8', '#c2185b', '#00897b'];

/**
 * The colour of a container's chip border and rail. `root` takes the theme's accent; any other name
 * is hashed onto a fixed set of hues, so a container keeps its colour for as long as it keeps its
 * name, across launches and on both surfaces.
 */
export function containerColor(name: string, COLORS: Palette): string {
  if (name === 'root') return COLORS.accent;
  let hash = 0;
  for (let index = 0; index < name.length; index += 1) {
    hash = (hash * 31 + name.charCodeAt(index)) | 0;
  }
  return TRACK_HUES[Math.abs(hash) % TRACK_HUES.length];
}
