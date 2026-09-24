import { useState } from 'react';

import {
  creatableValueTypes,
  type StorageAdapter,
  type StorageValueType,
} from '../../../features/storage/services/define-adapter.service';

const TYPE_LABELS: Record<StorageValueType, string> = {
  string: 'String',
  number: 'Number',
  boolean: 'Boolean',
  buffer: 'Binary',
};

/**
 * The empty row at the bottom of the table, as in a database table editor. Enter adds what is typed
 * as a pending key, and Sync writes it. The same rules as the app's Add sheet: a name, a type the
 * store takes, and a number that parses.
 */
export function NewEntryRow({
  adapter,
  onAdd,
}: {
  adapter: StorageAdapter;
  onAdd: (row: { key: string; valueType: StorageValueType; text: string }) => void;
}) {
  const types = creatableValueTypes(adapter);
  const firstType = types.includes('string') ? 'string' : (types[0] ?? 'string');
  const [key, setKey] = useState('');
  const [valueType, setValueType] = useState<StorageValueType>(firstType);
  const [text, setText] = useState('');
  // Uncontrolled fields, so clearing them after an add is a remount.
  const [generation, setGeneration] = useState(0);

  const numberBroken =
    valueType === 'number' && (text.trim().length === 0 || !Number.isFinite(Number(text.trim())));
  const ready = key.trim().length > 0 && !numberBroken;
  const value = valueType === 'boolean' ? (text === 'true' ? 'true' : 'false') : text;

  function add() {
    if (!ready) return;
    onAdd({ key: key.trim(), valueType, text: value });
    setKey('');
    setText('');
    setGeneration((current) => current + 1);
  }

  const onKeyDown = (event: { key?: string }) => {
    if (event.key === 'Enter') add();
  };

  return (
    <div className="axonpack-net-row axonpack-sto-new" key={generation}>
      <span>
        <input
          className="axonpack-sto-cell-input"
          placeholder="New key"
          aria-label="New key"
          spellCheck={false}
          onChange={(event) => setKey(String(event.target.value ?? ''))}
          onKeyDown={onKeyDown}
        />
      </span>
      <span>
        {types.length > 1 ? (
          <select
            className="axonpack-sto-cell-input"
            aria-label="Type"
            value={valueType}
            onChange={(event) => {
              setValueType(String(event.target.value) as StorageValueType);
              setText('');
            }}>
            {types.map((type) => (
              <option key={type} value={type}>
                {TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        ) : (
          <span className="axonpack-sto-kind">{TYPE_LABELS[firstType]}</span>
        )}
      </span>
      <span>
        {valueType === 'boolean' ? (
          <select
            className="axonpack-sto-cell-input"
            aria-label="Value"
            value={value}
            onChange={(event) => setText(String(event.target.value))}>
            <option value="false">false</option>
            <option value="true">true</option>
          </select>
        ) : (
          <input
            key={valueType}
            className="axonpack-sto-cell-input"
            placeholder={valueType === 'number' ? '0' : 'Value'}
            aria-label="Value"
            aria-invalid={(valueType === 'number' && text.length > 0 && numberBroken) || undefined}
            spellCheck={false}
            onChange={(event) => setText(String(event.target.value ?? ''))}
            onKeyDown={onKeyDown}
          />
        )}
      </span>
      <span>
        <button
          className="axonpack-sto-row-button"
          disabled={!ready}
          title="Add as a pending key, written on Sync"
          onClick={add}>
          Add
        </button>
      </span>
    </div>
  );
}
