import { useState, type CSSProperties } from 'react';

import { HighlightedText } from './highlighted-text.component';
import type { Palette } from '../../../core/constants/theme.const';
import { findMatches, type Matcher } from '../../../core/utils/text-search.util';
import { isClampable } from '../../../features/console/components/text-arg-cell.component';
import type { ConsoleArgTone } from '../../../features/console/utils/format-console-args.util';

function toneColor(
  tone: ConsoleArgTone,
  palette: Palette,
  plainColor?: string
): string | undefined {
  if (tone === 'number' || tone === 'boolean') return palette.jsonNumber;
  if (tone === 'muted') return palette.textSecondary;
  return plainColor;
}

/** One string argument, cut at six lines with Show more, at the same length the app cuts it. */
export function TextArg({
  text,
  tone,
  palette,
  plainColor,
  matcher,
}: {
  text: string;
  tone: ConsoleArgTone;
  palette: Palette;
  plainColor?: string;
  matcher: Matcher | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const clampable = isClampable(text);
  const style = { '--tone': toneColor(tone, palette, plainColor) } as CSSProperties;

  return (
    <>
      <span
        className="axonpack-con-text"
        style={style}
        data-clamped={(clampable && !expanded) || undefined}>
        <HighlightedText text={text} ranges={findMatches(text, matcher)} />
      </span>
      {clampable && (
        <button className="axonpack-con-link" onClick={() => setExpanded((open) => !open)}>
          {expanded ? 'Show less' : 'Show more'}
        </button>
      )}
    </>
  );
}
