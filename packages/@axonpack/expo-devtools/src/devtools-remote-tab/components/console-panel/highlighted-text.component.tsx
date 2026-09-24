import type { MatchRange } from '../../../core/utils/text-search.util';

/** Text with the search's matches wrapped in `mark`, the way the app's `HighlightedText` tints them. */
export function HighlightedText({ text, ranges }: { text: string; ranges: MatchRange[] }) {
  if (ranges.length === 0) return <>{text}</>;

  const pieces = [];
  let at = 0;
  for (const [start, end] of ranges) {
    if (start > at) pieces.push(text.slice(at, start));
    pieces.push(<mark key={start}>{text.slice(start, end)}</mark>);
    at = end;
  }
  if (at < text.length) pieces.push(text.slice(at));
  return <>{pieces}</>;
}
