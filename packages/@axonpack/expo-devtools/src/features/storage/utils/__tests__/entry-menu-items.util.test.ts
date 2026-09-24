import type { StorageEntry } from '../../stores/storage.store';
import { storageCopyTexts } from '../entry-menu-items.util';

function entry(text: string | null, kind: StorageEntry['kind']): StorageEntry {
  return { adapterId: 'memory', key: 'k', text, valueType: 'string', kind, size: 0 };
}

describe('storageCopyTexts', () => {
  it('offers the key, the value and the pair as JSON', () => {
    expect(storageCopyTexts(entry('v', 'string'))).toEqual([
      { label: 'Copy key', text: 'k' },
      { label: 'Copy value', text: 'v' },
      { label: 'Copy as JSON', text: '{\n  "k": "v"\n}' },
    ]);
  });

  it('adds a formatted copy only for a JSON value', () => {
    const labels = storageCopyTexts(entry('{"a":1}', 'json-object')).map((item) => item.label);
    expect(labels).toContain('Copy value (formatted)');
  });

  it('copies a missing value as empty text', () => {
    expect(storageCopyTexts(entry(null, 'absent'))[1].text).toBe('');
  });
});
