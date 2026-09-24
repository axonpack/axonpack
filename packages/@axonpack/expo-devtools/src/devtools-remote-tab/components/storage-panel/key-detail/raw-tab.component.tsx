import { COPY_ATTRIBUTE } from '@axonpack/react-native-devtools-tab';

import { formatSize } from '../../../../core/utils/format-bytes.util';
import { findMatches, type Matcher } from '../../../../core/utils/text-search.util';
import type { StorageEntry } from '../../../../features/storage/stores/storage.store';
import { HighlightedText } from '../../console-panel/highlighted-text.component';

/** The characters exactly as stored: no parsing, no pretty-printing. */
export function RawTab({ entry, matcher }: { entry: StorageEntry; matcher: Matcher | null }) {
  if (entry.text === null) return <p className="axonpack-net-none">This key holds no value.</p>;

  return (
    <>
      <div className="axonpack-sto-tools">
        <span>{`${entry.text.length} characters · ${formatSize(entry.size)}`}</span>
        <button
          className="axonpack-net-button"
          data-icon="copy"
          title="Copy value"
          {...{ [COPY_ATTRIBUTE]: entry.text }}
        />
      </div>
      <pre className="axonpack-net-code">
        <HighlightedText text={entry.text} ranges={findMatches(entry.text, matcher)} />
      </pre>
    </>
  );
}
