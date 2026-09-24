import { useMemo, useState } from 'react';

import type { StorageAdapter } from '../../../features/storage/services/define-adapter.service';
import {
  applyStorageImport,
  type StorageImportResult,
} from '../../../features/storage/services/import-storage.service';
import type { StorageEntry } from '../../../features/storage/stores/storage.store';
import {
  readStorageImport,
  STORAGE_IMPORT_SKIP_REASONS,
} from '../../../features/storage/utils/build-storage-export.util';
import { SyncedInput } from '../network-panel/synced-input.component';

/**
 * The app's Import sheet, in the pane. The app's Paste button has no twin: its handler would read
 * the device's clipboard, and a file picked here never reaches the app, since an event crosses as
 * its value alone. So the snapshot is pasted into the field.
 */
export function ImportPane({
  adapter,
  entries,
  onClose,
}: {
  adapter: StorageAdapter;
  entries: readonly StorageEntry[];
  onClose: () => void;
}) {
  const [text, setText] = useState('');
  const [applying, setApplying] = useState(false);
  const [result, setResult] = useState<StorageImportResult | null>(null);

  const reading = useMemo(
    () => readStorageImport(text, adapter, entries),
    [text, adapter, entries]
  );
  const plan = reading.state === 'read' ? reading.plan : null;
  const writeCount = plan === null ? 0 : plan.create.length + plan.overwrite.length;
  const clean = result !== null && result.failures.length === 0 && result.error === null;

  function edit(next: string) {
    setText(next);
    setResult(null);
  }

  async function apply() {
    if (plan === null) return;
    setApplying(true);
    setResult(await applyStorageImport(adapter.id, plan));
    setApplying(false);
  }

  return (
    <div className="axonpack-net-editor">
      <p className="axonpack-sto-note">
        Paste a snapshot this panel or the app exported. Nothing is written until you say so, and
        what it would do is worked out first.
      </p>
      <SyncedInput
        value={text}
        onChange={edit}
        placeholder='{ "schemaVersion": 1, … }'
        label="Snapshot"
        multiline
      />
      {text.length > 0 && (
        <div className="axonpack-sto-choices">
          <button className="axonpack-net-action" onClick={() => edit('')}>
            Clear
          </button>
        </div>
      )}

      {reading.state === 'unreadable' && (
        <p className="axonpack-sto-note" data-tone="error">
          {reading.message}
        </p>
      )}

      {plan !== null && (
        <>
          {plan.differentStore && (
            <p className="axonpack-sto-note" data-tone="warning">
              {`This file came from ${plan.fromStore}, not ${adapter.name}. Importing it anyway is allowed.`}
            </p>
          )}
          <p className="axonpack-net-none" style={{ padding: 0, color: 'var(--fg)' }}>
            {`${plan.create.length} new · ${plan.overwrite.length} overwritten · ${plan.unchanged.length} already match`}
          </p>
          {plan.skipped.length > 0 && (
            <p className="axonpack-sto-note">
              {`${plan.skipped.length} skipped — ${[
                ...new Set(plan.skipped.map((skip) => STORAGE_IMPORT_SKIP_REASONS[skip.reason])),
              ].join(', ')}`}
            </p>
          )}
        </>
      )}

      {result !== null && (
        <>
          {result.error !== null ? (
            <p className="axonpack-sto-note" data-tone="error">
              {result.error}
            </p>
          ) : (
            <p className="axonpack-sto-note">
              {`Wrote ${result.written} ${result.written === 1 ? 'key' : 'keys'}.`}
            </p>
          )}
          {result.failures.map((failure) => (
            <p key={failure.key} className="axonpack-sto-note" data-tone="error">
              {`${failure.key} — ${failure.message}`}
            </p>
          ))}
        </>
      )}

      <div className="axonpack-net-editor-actions">
        <button className="axonpack-net-action" disabled={applying} onClick={onClose}>
          {clean ? 'Done' : 'Cancel'}
        </button>
        <button
          className="axonpack-net-action"
          data-tone="accent"
          disabled={writeCount === 0 || applying}
          onClick={apply}>
          {applying ? 'Writing…' : writeCount === 0 ? 'Nothing to write' : `Write ${writeCount}`}
        </button>
      </div>
    </div>
  );
}
