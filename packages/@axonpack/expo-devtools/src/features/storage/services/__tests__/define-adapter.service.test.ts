import {
  asyncStorageAdapter,
  defineStorageAdapter,
  isEditableValueType,
  mmkvAdapter,
  resolveStorageAdapters,
  secureStoreAdapter,
  type MmkvLikeDriver,
} from '../define-adapter.service';

function mapDriver(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial));
  return {
    map,
    definition: defineStorageAdapter({
      name: 'Memory',
      kind: 'sync',
      getAllKeys: () => [...map.keys()],
      getItem: (key: string) => map.get(key) ?? null,
      setItem: (key: string, text: string) => {
        map.set(key, text);
      },
      removeItem: (key: string) => {
        map.delete(key);
      },
    }),
  };
}

describe('defineStorageAdapter', () => {
  it('normalises a sync driver to promises and a bare string to a read result', async () => {
    const { definition } = mapDriver({ a: '1' });

    await expect(definition.getAllKeys()).resolves.toEqual(['a']);
    await expect(definition.getItem('a')).resolves.toEqual({ text: '1', valueType: 'string' });
  });

  it('reports a missing key as absent rather than as an empty value', async () => {
    const { definition } = mapDriver();
    await expect(definition.getItem('nope')).resolves.toEqual({ text: null, valueType: 'string' });
  });

  it('keeps an empty string as a value', async () => {
    const { definition } = mapDriver({ blank: '' });
    await expect(definition.getItem('blank')).resolves.toEqual({ text: '', valueType: 'string' });
  });

  it('turns enumeration off when handed a fixed key list', () => {
    const definition = defineStorageAdapter({
      name: 'Fixed',
      keys: ['one', 'two'],
      getItem: () => null,
    });

    expect(definition.canEnumerate).toBe(false);
  });

  it('refuses a config that can neither list nor be told its keys', () => {
    expect(() => defineStorageAdapter({ name: 'Blind', getItem: () => null })).toThrow(
      /getAllKeys/
    );
  });
});

describe('resolveStorageAdapters', () => {
  it('slugs the name into an id and suffixes a collision', () => {
    const adapters = resolveStorageAdapters([
      defineStorageAdapter({ name: 'My Store', keys: [], getItem: () => null }),
      defineStorageAdapter({ name: 'my store', keys: [], getItem: () => null }),
      defineStorageAdapter({ name: '!!!', keys: [], getItem: () => null }),
    ]);

    expect(adapters.map((adapter) => adapter.id)).toEqual(['my-store', 'my-store-2', 'store']);
  });

  it('derives the write capabilities from the methods the driver provided', () => {
    const [writable, readable] = resolveStorageAdapters([
      mapDriver().definition,
      defineStorageAdapter({ name: 'Read', keys: [], getItem: () => null }),
    ]);

    expect([writable.canEdit, writable.canDelete]).toEqual([true, true]);
    expect([readable.canEdit, readable.canDelete]).toEqual([false, false]);
  });

  it('lets the global readOnly default take away capabilities the driver has', () => {
    const [adapter] = resolveStorageAdapters([mapDriver().definition], { readOnly: true });

    expect(adapter.readOnly).toBe(true);
    expect([adapter.canEdit, adapter.canDelete]).toEqual([false, false]);
  });

  it("lets one adapter's own flag win over the global default", () => {
    const { map } = mapDriver();
    const [adapter] = resolveStorageAdapters(
      [
        defineStorageAdapter({
          name: 'Mine',
          readOnly: false,
          getAllKeys: () => [...map.keys()],
          getItem: (key: string) => map.get(key) ?? null,
          setItem: (key: string, text: string) => {
            map.set(key, text);
          },
        }),
      ],
      { readOnly: true }
    );

    expect(adapter.canEdit).toBe(true);
  });
});

describe('asyncStorageAdapter', () => {
  it("reads a batch through async-storage 3's getMany", async () => {
    const getMany = jest.fn(async (keys: string[]) =>
      Object.fromEntries(keys.map((key) => [key, key === 'gone' ? null : `value-${key}`]))
    );
    const definition = asyncStorageAdapter({
      driver: { getAllKeys: async () => ['a', 'gone'], getItem: async () => null, getMany },
    });

    const results = await definition.getMany?.(['a', 'gone']);

    expect(results?.get('a')).toEqual({ text: 'value-a', valueType: 'string' });
    expect(results?.get('gone')).toEqual({ text: null, valueType: 'string' });
  });

  it('reads a batch through multiGet when the driver has one', async () => {
    const multiGet = jest.fn(async (keys: string[]) =>
      keys.map((key) => [key, `value-${key}`] as [string, string])
    );
    const definition = asyncStorageAdapter({
      driver: {
        getAllKeys: async () => ['a', 'b'],
        getItem: async () => null,
        multiGet,
      },
    });

    const results = await definition.getMany?.(['a', 'b']);

    expect(multiGet).toHaveBeenCalledWith(['a', 'b']);
    expect(results?.get('b')).toEqual({ text: 'value-b', valueType: 'string' });
  });

  it('offers no batch read when the driver has no multiGet', () => {
    const definition = asyncStorageAdapter({
      driver: { getAllKeys: async () => [], getItem: async () => null },
    });

    expect(definition.getMany).toBeUndefined();
    expect(definition.setItem).toBeUndefined();
  });
});

describe('mmkvAdapter', () => {
  function driverFor(values: Record<string, string | number | boolean | Uint8Array>) {
    const store = new Map(Object.entries(values));
    const typed = <T>(key: string, kind: string): T | undefined => {
      const value = store.get(key);
      return typeof value === kind ? (value as T) : undefined;
    };

    const driver: MmkvLikeDriver = {
      getAllKeys: () => [...store.keys()],
      getString: (key) => typed<string>(key, 'string'),
      getNumber: (key) => typed<number>(key, 'number'),
      getBoolean: (key) => typed<boolean>(key, 'boolean'),
      getBuffer: (key) => {
        const value = store.get(key);
        return value instanceof Uint8Array ? value : undefined;
      },
      set: (key, value) => {
        store.set(key, value);
      },
      delete: (key) => {
        store.delete(key);
      },
    };

    return { store, driver, definition: mmkvAdapter({ driver }) };
  }

  it('finds each stored type by probing the getters in turn', async () => {
    const { definition } = driverFor({
      text: 'hello',
      count: 7,
      flag: true,
      blob: new Uint8Array([1, 2, 3]),
    });

    await expect(definition.getItem('text')).resolves.toEqual({
      text: 'hello',
      valueType: 'string',
    });
    await expect(definition.getItem('count')).resolves.toEqual({
      text: '7',
      valueType: 'number',
    });
    await expect(definition.getItem('flag')).resolves.toEqual({
      text: 'true',
      valueType: 'boolean',
    });
    await expect(definition.getItem('blob')).resolves.toEqual({
      text: '3 bytes',
      valueType: 'buffer',
    });
  });

  it('treats a stored 0 and a stored false as values, not as misses', async () => {
    const { definition } = driverFor({ zero: 0, off: false });

    await expect(definition.getItem('zero')).resolves.toEqual({ text: '0', valueType: 'number' });
    await expect(definition.getItem('off')).resolves.toEqual({
      text: 'false',
      valueType: 'boolean',
    });
  });

  it('writes back through the type the value was read as', async () => {
    const { store, definition } = driverFor({ count: 7, flag: true, text: 'a' });

    await definition.setItem?.('count', '9', 'number');
    await definition.setItem?.('flag', 'false', 'boolean');
    await definition.setItem?.('text', '9', 'string');

    expect(store.get('count')).toBe(9);
    expect(store.get('flag')).toBe(false);
    expect(store.get('text')).toBe('9');
  });

  it('refuses a write that would change the stored type', async () => {
    const { definition } = driverFor({ count: 7, flag: true, blob: new Uint8Array([1]) });

    await expect(definition.setItem?.('count', 'abc', 'number')).rejects.toThrow(/not a number/);
    await expect(definition.setItem?.('flag', 'yes', 'boolean')).rejects.toThrow(/true or false/);
    await expect(definition.setItem?.('blob', 'x', 'buffer')).rejects.toThrow(/binary/);
  });
});

describe('secureStoreAdapter', () => {
  it('cannot enumerate, and reads only the declared keys', async () => {
    const getItemAsync = jest.fn(async (key: string) => (key === 'session' ? 'token' : null));
    const definition = secureStoreAdapter({
      driver: { getItemAsync },
      keys: ['session', 'pin'],
      options: { keychainService: 'test' },
    });

    expect(definition.canEnumerate).toBe(false);
    await expect(definition.getAllKeys()).resolves.toEqual(['session', 'pin']);
    await expect(definition.getItem('session')).resolves.toEqual({
      text: 'token',
      valueType: 'string',
    });
    expect(getItemAsync).toHaveBeenCalledWith('session', { keychainService: 'test' });
  });
});

describe('isEditableValueType', () => {
  it('excludes binary only', () => {
    expect(isEditableValueType('string')).toBe(true);
    expect(isEditableValueType('number')).toBe(true);
    expect(isEditableValueType('buffer')).toBe(false);
  });
});
