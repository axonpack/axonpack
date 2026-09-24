import { useState } from 'react';

import {
  isEditableValueType,
  type StorageAdapter,
} from '../../../../features/storage/services/define-adapter.service';
import { setStorageValue } from '../../../../features/storage/services/write-storage.service';
import type { StorageEntry } from '../../../../features/storage/stores/storage.store';
import { parseStoredJson } from '../../../../features/storage/utils/classify-value.util';
import { SyncedInput } from '../../network-panel/synced-input.component';

export function EditTab({ entry, adapter }: { entry: StorageEntry; adapter: StorageAdapter }) {
  const [draft, setDraft] = useState(entry.text ?? '');
  const [savedText, setSavedText] = useState(entry.text);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The store re-reads the key after a save, so the entry arriving with new text is the signal that
  // the write landed. A write from the device arrives the same way.
  if (entry.text !== savedText) {
    setSavedText(entry.text);
    setDraft(entry.text ?? '');
    setError(null);
  }

  if (!adapter.canEdit) {
    return (
      <p className="axonpack-net-none">
        {adapter.readOnly
          ? `${adapter.name} is registered read-only.`
          : `${adapter.name} was registered without a way to write.`}
      </p>
    );
  }
  if (!isEditableValueType(entry.valueType)) {
    return <p className="axonpack-net-none">A binary value cannot be edited here.</p>;
  }

  const jsonExpected = entry.kind === 'json-object' || entry.kind === 'json-array';
  const jsonBroken = jsonExpected && draft.trim().length > 0 && parseStoredJson(draft) === null;
  const blocked = draft === (entry.text ?? '') || saving;

  async function save() {
    setSaving(true);
    setError(null);
    const message = await setStorageValue(entry, draft);
    setSaving(false);
    if (message !== null) setError(message);
  }

  return (
    <div className="axonpack-net-editor">
      <p className="axonpack-sto-note">
        {entry.valueType === 'number'
          ? 'This key holds a number — it is written back as one.'
          : entry.valueType === 'boolean'
            ? 'This key holds a boolean — enter true or false.'
            : `Writes into ${adapter.name} under "${entry.key}".`}
      </p>
      <SyncedInput value={draft} onChange={setDraft} label="Value" multiline />
      {/* A warning, not a block: a store is free to hold text that was never JSON. */}
      {jsonBroken && (
        <p className="axonpack-sto-note" data-tone="warning">
          This value was stored as JSON and what you've typed no longer parses. Saving it anyway is
          allowed.
        </p>
      )}
      {error !== null && (
        <p className="axonpack-sto-note" data-tone="error">
          {error}
        </p>
      )}
      <div className="axonpack-net-editor-actions">
        <button
          className="axonpack-net-action"
          disabled={blocked}
          onClick={() => {
            setDraft(entry.text ?? '');
            setError(null);
          }}>
          Revert
        </button>
        <button
          className="axonpack-net-action"
          data-tone="accent"
          disabled={blocked}
          onClick={save}>
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  );
}
