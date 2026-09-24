import { memo } from 'react';

import { StorageEntryMenu } from './entry-menu.component';
import { HighlightedText } from '../console-panel/highlighted-text.component';
import type { Palette } from '../../../core/constants/theme.const';
import { formatSize } from '../../../core/utils/format-bytes.util';
import { findMatches, type Matcher } from '../../../core/utils/text-search.util';
import {
  STORED_VALUE_ICONS,
  STORED_VALUE_LABELS,
} from '../../../features/storage/constants/value-type-icons.const';
import type { StorageEntry } from '../../../features/storage/stores/storage.store';
import {
  classifyStoredValue,
  storedValueColor,
} from '../../../features/storage/utils/classify-value.util';
import { previewLine } from '../../../features/storage/utils/formatters.util';

function EntryRowBase({
  entry,
  matcher,
  palette,
  compact,
  selected,
  onSelect,
  menuOpen,
  onMenu,
  inlineEditable,
  multiline,
  editing,
  draft,
  error,
  onEdit,
  onDraft,
}: {
  entry: StorageEntry;
  matcher: Matcher | null;
  palette: Palette;
  /** Key alone, while the key pane has the rest of the width. */
  compact: boolean;
  selected: boolean;
  /** With `'edit'` to open the pane on its Edit tab. */
  onSelect: (key: string, tab?: 'edit') => void;
  menuOpen: boolean;
  onMenu: (key: string | null) => void;
  /** The store can write this key, as the type it holds. */
  inlineEditable: boolean;
  /** An `input` would drop the line breaks, so a double-click opens the Edit tab instead. */
  multiline: boolean;
  editing: boolean;
  /** What was typed and not yet synced. */
  draft: string | undefined;
  error: string | undefined;
  onEdit: (key: string | null) => void;
  onDraft: (key: string, text: string | null) => void;
}) {
  const shown = draft ?? entry.text;
  // What the value would be once synced, so the type follows the typing rather than the last read.
  const kind = draft === undefined ? entry.kind : classifyStoredValue(draft, entry.valueType);
  const tint = selected ? undefined : { color: storedValueColor(palette, kind) };
  const preview = previewLine(shown);
  const open = () => onSelect(entry.key);
  const stored = entry.text ?? '';

  return (
    <>
      {/*
        The click is on the cells, not the row. A handler cannot stop a click bubbling, so a row that
        opened the pane would open it under a double-click on the value, and hide the value with it.
      */}
      <div
        className="axonpack-net-row"
        data-selected={selected || undefined}
        data-dirty={draft !== undefined || undefined}
        data-error={error !== undefined || undefined}
        onContextMenu={() => onMenu(entry.key)}>
        <span title={error ?? entry.key} onClick={open}>
          <span
            className="axonpack-material axonpack-sto-kind-icon"
            data-material={STORED_VALUE_ICONS[kind]}
            style={tint}
          />
          <HighlightedText text={entry.key} ranges={findMatches(entry.key, matcher)} />
        </span>
        {!compact && (
          <>
            <span className="axonpack-sto-kind" style={tint} onClick={open}>
              {STORED_VALUE_LABELS[kind]}
            </span>
            {editing ? (
              <span className="axonpack-sto-editing">
                <input
                  className="axonpack-sto-cell-input"
                  defaultValue={shown ?? ''}
                  aria-label={`Value of ${entry.key}`}
                  autoFocus
                  spellCheck={false}
                  onChange={(event) => {
                    const next = String(event.target.value ?? '');
                    onDraft(entry.key, next === stored ? null : next);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') onEdit(null);
                    if (event.key === 'Escape') {
                      onDraft(entry.key, null);
                      onEdit(null);
                    }
                  }}
                  onBlur={() => onEdit(null)}
                />
              </span>
            ) : entry.error !== undefined ? (
              <span data-tone="error" title={entry.error} onClick={open}>
                {entry.error}
              </span>
            ) : inlineEditable ? (
              <span
                className="axonpack-sto-value"
                title="Double-click to edit"
                onDoubleClick={() => (multiline ? onSelect(entry.key, 'edit') : onEdit(entry.key))}>
                <HighlightedText text={preview} ranges={findMatches(preview, matcher)} />
              </span>
            ) : (
              <span className="axonpack-sto-value" title={preview} onClick={open}>
                <HighlightedText text={preview} ranges={findMatches(preview, matcher)} />
              </span>
            )}
            <span onClick={open}>{formatSize(entry.size)}</span>
          </>
        )}
      </div>
      {/* Beside the row, not in it: a click in the menu would open the key too. */}
      {menuOpen && <StorageEntryMenu entry={entry} onClose={() => onMenu(null)} />}
    </>
  );
}

/** The store replaces an entry's object only when that key changes, so this skips every other row. */
export const EntryRow = memo(EntryRowBase);
