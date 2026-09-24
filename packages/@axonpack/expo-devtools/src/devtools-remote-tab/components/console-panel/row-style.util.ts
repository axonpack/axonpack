import type { CSSProperties } from 'react';

import type { ConsoleLevelVisual } from '../../../features/console/constants/console-levels.const';

/** A row's colours as CSS variables, so the stylesheet stays one string for every theme. */
export function rowStyle(visual: ConsoleLevelVisual): CSSProperties {
  return { '--row-color': visual.color, '--row-surface': visual.surface } as CSSProperties;
}
