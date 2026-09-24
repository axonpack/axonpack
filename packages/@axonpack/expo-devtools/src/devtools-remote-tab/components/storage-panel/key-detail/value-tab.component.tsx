import { COPY_ATTRIBUTE } from '@axonpack/react-native-devtools-tab';

import { findMatches, type Matcher } from '../../../../core/utils/text-search.util';
import type { StorageEntry } from '../../../../features/storage/stores/storage.store';
import {
  isTreeValue,
  parseStoredJson,
} from '../../../../features/storage/utils/classify-value.util';
import { HighlightedText } from '../../console-panel/highlighted-text.component';
import { JsonTree } from '../../network-panel/request-detail/json-tree.component';

export function ValueTab({ entry, matcher }: { entry: StorageEntry; matcher: Matcher | null }) {
  if (entry.error !== undefined) {
    return (
      <p className="axonpack-net-none" data-tone="error">
        {entry.error}
      </p>
    );
  }
  if (entry.text === null) return <p className="axonpack-net-none">This key holds no value.</p>;
  if (entry.kind === 'buffer') {
    return (
      <>
        <p className="axonpack-net-none">{`Binary — ${entry.text}`}</p>
        <p className="axonpack-net-none">
          There is no text form of these bytes to show, so only their length is reported.
        </p>
      </>
    );
  }

  const parsed = parseStoredJson(entry.text);

  return (
    <>
      <div className="axonpack-sto-tools">
        <button
          className="axonpack-net-button"
          data-icon="copy"
          title="Copy value"
          {...{ [COPY_ATTRIBUTE]: entry.text }}
        />
      </div>
      {parsed !== null && isTreeValue(parsed) ? (
        <JsonTree value={parsed} matcher={matcher} />
      ) : (
        <pre className="axonpack-net-code">
          <HighlightedText text={entry.text} ranges={findMatches(entry.text, matcher)} />
        </pre>
      )}
    </>
  );
}
