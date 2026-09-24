import { useState } from 'react';

import {
  creatableValueTypes,
  type StorageAdapter,
  type StorageValueType,
} from '../../../features/storage/services/define-adapter.service';
import { createStorageKey } from '../../../features/storage/services/write-storage.service';
import { SyncedInput } from '../network-panel/synced-input.component';

const TYPE_LABELS: Record<StorageValueType, string> = {
  string: 'String',
  number: 'Number',
  boolean: 'Boolean',
  buffer: 'Binary',
};

function initialValueFor(valueType: StorageValueType): string {
  return valueType === 'boolean' ? 'false' : '';
}

/**
 * The app's Add key sheet, in the pane. Mounted each time it opens, which is what clears it; a
 * failed add leaves what was typed on screen to fix.
 */
export function AddKeyPane({ adapter, onClose }: { adapter: StorageAdapter; onClose: () => void }) {
  const types = creatableValueTypes(adapter);
  const firstType = types.includes('string') ? 'string' : (types[0] ?? 'string');

  const [key, setKey] = useState('');
  const [valueType, setValueType] = useState<StorageValueType>(firstType);
  const [draft, setDraft] = useState(() => initialValueFor(firstType));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function chooseType(next: StorageValueType) {
    setValueType(next);
    setDraft(initialValueFor(next));
    setError(null);
  }

  const numberBroken = valueType === 'number' && !Number.isFinite(Number(draft.trim()));
  const incomplete =
    key.trim().length === 0 || (valueType === 'number' && draft.trim().length === 0);
  const blocked = incomplete || numberBroken || saving;

  async function add() {
    setSaving(true);
    setError(null);
    const message = await createStorageKey(adapter.id, key.trim(), draft, valueType);
    setSaving(false);
    if (message === null) onClose();
    else setError(message);
  }

  return (
    <div className="axonpack-net-editor">
      <label className="axonpack-net-field">
        Key
        <SyncedInput value={key} onChange={setKey} placeholder="Name the key" label="Key" />
      </label>

      {types.length > 1 && (
        <div className="axonpack-sto-choices" role="group" aria-label="Type">
          <span className="axonpack-sto-label">Type</span>
          {types.map((current) => (
            <button
              key={current}
              className="axonpack-net-type"
              aria-pressed={current === valueType}
              onClick={() => chooseType(current)}>
              {TYPE_LABELS[current]}
            </button>
          ))}
        </div>
      )}

      {valueType === 'boolean' ? (
        <div className="axonpack-sto-choices" role="group" aria-label="Value">
          <span className="axonpack-sto-label">Value</span>
          {['true', 'false'].map((value) => (
            <button
              key={value}
              className="axonpack-net-type"
              aria-pressed={draft === value}
              onClick={() => setDraft(value)}>
              {value}
            </button>
          ))}
        </div>
      ) : valueType === 'number' ? (
        <label
          className="axonpack-net-field"
          data-invalid={(draft.trim().length > 0 && numberBroken) || undefined}>
          Value
          <SyncedInput value={draft} onChange={setDraft} placeholder="0" label="Value" />
        </label>
      ) : (
        <SyncedInput value={draft} onChange={setDraft} label="Value" multiline />
      )}

      {types.length === 1 && (
        <p className="axonpack-sto-note">
          {`${adapter.name} holds ${TYPE_LABELS[firstType].toLowerCase()} values only.`}
        </p>
      )}
      {!adapter.canEnumerate && (
        // The panel reads a declared list for this store, so a key outside it is written but then
        // disappears on the next refresh. Better said now than discovered then.
        <p className="axonpack-sto-note">
          {`${adapter.name} cannot list its own keys, so a new key shows here until the next refresh unless it is one of the keys this store was registered with.`}
        </p>
      )}
      {error !== null && (
        <p className="axonpack-sto-note" data-tone="error">
          {error}
        </p>
      )}

      <div className="axonpack-net-editor-actions">
        <button className="axonpack-net-action" disabled={saving} onClick={onClose}>
          Cancel
        </button>
        <button className="axonpack-net-action" data-tone="accent" disabled={blocked} onClick={add}>
          {saving ? 'Adding…' : 'Add key'}
        </button>
      </div>
    </div>
  );
}
