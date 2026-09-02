/**
 * Storage adapters — the one thing this package cannot discover for itself.
 *
 * Network patches globals it knows exist and Performance reads platform APIs, but a key-value store
 * is a separate install with its own native code (`@react-native-async-storage/async-storage`,
 * `react-native-mmkv`, `expo-secure-store`), and this package deliberately holds no dependency on
 * any of them. So the consumer hands its stores over at `createDevtoolsClient` time, and every
 * driver shape is normalised here into one internal adapter the rest of the tab talks to.
 */

/** Accepting a plain value too is what lets a sync driver share one code path with an async one. */
type MaybePromise<T> = T | Promise<T>;

/**
 * Whether a store's driver answers immediately (`'sync'`, e.g. MMKV) or with a promise (`'async'`,
 * e.g. AsyncStorage). Shown as a badge on the store; the tab awaits every read either way, so this
 * never changes how a driver is called.
 */
export type StorageAdapterKind = 'async' | 'sync';

/**
 * What the driver actually handed back, so a stored `1` doesn't render as the string `"1"`. Also
 * what an edit is written back as, which is why editing a number keeps it a number.
 */
export type StorageValueType = 'string' | 'number' | 'boolean' | 'buffer';

/**
 * What a store is assumed to hold when nothing says otherwise. A store that only takes strings —
 * AsyncStorage and SecureStore both do — says so, and the editor then offers nothing it would have
 * to fail on.
 */
export const ALL_VALUE_TYPES: readonly StorageValueType[] = [
  'string',
  'number',
  'boolean',
  'buffer',
];

/**
 * One value as a custom driver reports it. Return this from `getItem` when the store holds more than
 * strings; a plain string (or `null`) is accepted too and read as `valueType: 'string'`.
 */
export type StorageReadResult = {
  /** `null` is an absent key. `''` is a value — a store can legitimately hold an empty string. */
  text: string | null;
  /** What the driver actually held, so the tab can badge and re-write it correctly. */
  valueType: StorageValueType;
};

/** A driver may answer with a bare string; `defineStorageAdapter` normalises it. */
export type StorageReadValue = string | null | undefined | StorageReadResult;

/**
 * A key this tab must never read. A regex covers the common case (`/^auth\./`), a predicate covers
 * everything else — a token or a large binary cache key stays where it is rather than being read
 * into memory and rendered.
 */
export type StorageKeyBlacklist = RegExp | ((key: string) => boolean);

/**
 * What `defineStorageAdapter` takes — the escape hatch for a store none of the three built-in
 * factories cover (an in-memory `Map`, a SQLite table, your own wrapper).
 *
 * Only `name` and `getItem` are required; leave `setItem` / `removeItem` out and the store is
 * inspectable but not editable.
 */
export type StorageAdapterConfig = {
  /** What the store is called in the tab's store picker. */
  name: string;
  /** Whether the driver is synchronous. Defaults to `'async'`; a badge only. */
  kind?: StorageAdapterKind;
  /** Inspect but never write. Defaults to `false`, or to `storage.readOnly` when that is set. */
  readOnly?: boolean;
  /**
   * A fixed key list, for a store that cannot enumerate itself (SecureStore). Passing it turns
   * `canEnumerate` off, which is what makes the UI say so instead of implying the store is empty.
   *
   * A function is resolved on every read, for an app that keeps the list of what it stored somewhere
   * of its own — the keys are then as current as the app is, rather than as current as `init()`.
   */
  keys?: readonly string[] | (() => MaybePromise<readonly string[]>);
  /** The types this store can hold. Defaults to all four — declare it when the store is narrower. */
  supportedTypes?: readonly StorageValueType[];
  /** Keys the tab must not read, list, or write. */
  blacklist?: StorageKeyBlacklist;
  /**
   * How the store lists what it holds. Leave it out only when you passed `keys` instead — without
   * either, the tab has nothing to read.
   */
  getAllKeys?: () => MaybePromise<readonly string[]>;
  /**
   * Reads one key. Return a string, `null` for an absent key, or a `StorageReadResult` when the
   * store holds more than strings. The only required behaviour of a driver.
   */
  getItem: (key: string) => MaybePromise<StorageReadValue>;
  /** A batch read, when the driver has one. Keys absent from the result are treated as unset. */
  getMany?: (keys: string[]) => MaybePromise<Map<string, StorageReadResult>>;
  /**
   * Writes one key, with the type the value was read as so an edit keeps it. Omit to make the store
   * read-only; the tab then hides its edit affordances rather than failing on them.
   */
  setItem?: (key: string, text: string, valueType: StorageValueType) => MaybePromise<unknown>;
  /** Deletes one key. Omit and the tab offers no delete for this store. */
  removeItem?: (key: string) => MaybePromise<unknown>;
};

/**
 * A ready-to-register store, as returned by `asyncStorageAdapter`, `mmkvAdapter`,
 * `secureStoreAdapter` and `defineStorageAdapter`. Pass them to
 * `createDevtoolsClient({ storage: { adapters } })`; you never build this shape by hand.
 */
export type StorageAdapterDefinition = {
  /** The store's display name. */
  name: string;
  /** Whether the driver is synchronous. */
  kind: StorageAdapterKind;
  /** Inspect but never write. Unset here means "no opinion" — `storage.readOnly` then decides. */
  readOnly?: boolean;
  /**
   * Whether the store can list its own keys. `false` for a fixed `keys` list (SecureStore), which is
   * what makes the tab say so instead of implying the store is empty.
   */
  canEnumerate: boolean;
  /** The value types this store can hold, used to bound what the editor offers. */
  supportedTypes: StorageValueType[];
  /** Resolved from `blacklist`; always present, and answers `false` when nothing was declared. */
  isHidden: (key: string) => boolean;
  /** Whether a blacklist was declared at all, so the tab can say some keys are hidden. */
  hasBlacklist: boolean;
  /** Lists the store's keys, blacklisted ones already removed. */
  getAllKeys: () => Promise<string[]>;
  /** Reads one key, normalised to a `StorageReadResult`. */
  getItem: (key: string) => Promise<StorageReadResult>;
  /** Batch read, when the driver had one — the tab prefers it over per-key reads. */
  getMany?: (keys: string[]) => Promise<Map<string, StorageReadResult>>;
  /** Writes one key. Absent when the driver cannot write. */
  setItem?: (key: string, text: string, valueType: StorageValueType) => Promise<void>;
  /** Deletes one key. Absent when the driver cannot delete. */
  removeItem?: (key: string) => Promise<void>;
};

/**
 * A registered store as the Storage tab sees it: a `StorageAdapterDefinition` with its id assigned
 * and the read-only question settled. Produced at `init()`; read it from
 * `devtools.storageStore.getSnapshot()`.
 */
export type StorageAdapter = Omit<StorageAdapterDefinition, 'readOnly'> & {
  /** Slug of `name`, suffixed on collision — the stable key every store lookup goes through. */
  id: string;
  /** Settled from the adapter's own `readOnly`, then `storage.readOnly`, then `false`. */
  readOnly: boolean;
  /** `true` when the driver can write and the store is not read-only. */
  canEdit: boolean;
  /** `true` when the driver can delete and the store is not read-only. */
  canDelete: boolean;
};

const ABSENT: StorageReadResult = { text: null, valueType: 'string' };

function toHiddenPredicate(blacklist: StorageKeyBlacklist | undefined): (key: string) => boolean {
  if (blacklist === undefined) return () => false;
  if (typeof blacklist === 'function') return (key) => blacklist(key);

  // A `/g` or `/y` regex carries `lastIndex` from one call to the next, so the same key would test
  // true, then false, then true again — reset before every test rather than ask the caller to.
  return (key) => {
    blacklist.lastIndex = 0;
    return blacklist.test(key);
  };
}

function toReadResult(value: StorageReadValue): StorageReadResult {
  if (value === null || value === undefined) return { text: null, valueType: 'string' };
  if (typeof value === 'string') return { text: value, valueType: 'string' };
  return value;
}

/**
 * Registers any store of your own with the Storage tab — an in-memory `Map`, a SQLite table, a
 * wrapper around something else. The escape hatch the three factories below are written in terms of.
 *
 * ```ts
 * defineStorageAdapter({
 *   name: 'Memory',
 *   kind: 'sync',
 *   getAllKeys: () => [...map.keys()],
 *   getItem: (key) => map.get(key) ?? null,
 *   setItem: (key, text) => map.set(key, text),
 *   removeItem: (key) => map.delete(key),
 * });
 * ```
 *
 * It duck-types nothing — it takes exactly what it is handed and only normalises sync answers to
 * promises.
 */
export function defineStorageAdapter(config: StorageAdapterConfig): StorageAdapterDefinition {
  const { keys: fixedKeys, getAllKeys, getItem, getMany, setItem, removeItem } = config;
  const isHidden = toHiddenPredicate(config.blacklist);

  // Filtered here rather than in the view, and here rather than in `readAdapter`, so no path that
  // lists keys can forget to: a blacklisted key is never read, so it never reaches memory at all.
  let listKeys: () => Promise<string[]>;
  if (typeof fixedKeys === 'function') {
    listKeys = async () => [...(await fixedKeys())].filter((key) => !isHidden(key));
  } else if (fixedKeys) {
    listKeys = async () => fixedKeys.filter((key) => !isHidden(key));
  } else if (getAllKeys) {
    listKeys = async () => [...(await getAllKeys())].filter((key) => !isHidden(key));
  } else {
    throw new Error(
      `Storage adapter "${config.name}" needs either a getAllKeys function or a keys list.`
    );
  }

  return {
    name: config.name,
    kind: config.kind ?? 'async',
    readOnly: config.readOnly,
    canEnumerate: !fixedKeys,
    supportedTypes: [...(config.supportedTypes ?? ALL_VALUE_TYPES)],
    isHidden,
    hasBlacklist: config.blacklist !== undefined,
    getAllKeys: listKeys,
    getItem: async (key) => (isHidden(key) ? ABSENT : toReadResult(await getItem(key))),
    getMany: getMany && (async (keys) => getMany(keys.filter((key) => !isHidden(key)))),
    setItem:
      setItem &&
      (async (key, text, valueType) => {
        if (isHidden(key)) throw new Error(`"${key}" is hidden by this store's blacklist.`);
        await setItem(key, text, valueType);
      }),
    removeItem:
      removeItem &&
      (async (key) => {
        if (isHidden(key)) throw new Error(`"${key}" is hidden by this store's blacklist.`);
        await removeItem(key);
      }),
  };
}

/**
 * The parts of `@react-native-async-storage/async-storage` this package uses. Duck-typed rather than
 * imported, so the library stays the consumer's dependency — pass `AsyncStorage` itself as `driver`.
 *
 * Only the two reads are required; without `setItem` / `removeItem` the store is inspect-only.
 */
export type AsyncStorageLikeDriver = {
  /** Lists every key in the store. */
  getAllKeys: () => MaybePromise<readonly string[]>;
  /** Reads one key; `null` for an absent one. */
  getItem: (key: string) => MaybePromise<string | null>;
  /** The batch read as of async-storage 3. */
  getMany?: (keys: string[]) => MaybePromise<Record<string, string | null>>;
  /** The batch read in async-storage 1 and 2, kept because plenty of apps are still there. */
  multiGet?: (keys: string[]) => MaybePromise<readonly (readonly [string, string | null])[]>;
  /** Writes one key. Omit to make the store read-only. */
  setItem?: (key: string, value: string) => MaybePromise<unknown>;
  /** Deletes one key. Omit and the tab offers no delete. */
  removeItem?: (key: string) => MaybePromise<unknown>;
};

/**
 * Registers `@react-native-async-storage/async-storage`, or anything copying its API, with the
 * Storage tab.
 *
 * ```ts
 * storage: { adapters: [asyncStorageAdapter({ driver: AsyncStorage })] }
 * ```
 *
 * `name` defaults to `'AsyncStorage'`. Values are always strings here, whatever they were written
 * as. Every call goes through the driver object rather than a destructured reference: a driver
 * method may well be bound to a native instance, and pulling it off the object would strand `this`.
 */
export function asyncStorageAdapter(config: {
  driver: AsyncStorageLikeDriver;
  name?: string;
  readOnly?: boolean;
  blacklist?: StorageKeyBlacklist;
}): StorageAdapterDefinition {
  const { driver } = config;
  const hasGetMany = typeof driver.getMany === 'function';
  const hasMultiGet = typeof driver.multiGet === 'function';
  const hasSet = typeof driver.setItem === 'function';
  const hasRemove = typeof driver.removeItem === 'function';

  async function readMany(keys: string[]): Promise<Map<string, StorageReadResult>> {
    const results = new Map<string, StorageReadResult>();

    if (hasGetMany) {
      const record = (await driver.getMany?.(keys)) ?? {};
      for (const [key, value] of Object.entries(record)) {
        results.set(key, { text: value ?? null, valueType: 'string' });
      }
      return results;
    }

    const pairs = (await driver.multiGet?.(keys)) ?? [];
    for (const [key, value] of pairs) {
      results.set(key, { text: value ?? null, valueType: 'string' });
    }
    return results;
  }

  return defineStorageAdapter({
    name: config.name ?? 'AsyncStorage',
    kind: 'async',
    readOnly: config.readOnly,
    blacklist: config.blacklist,
    // Everything in here is a string on the way out, whatever it was on the way in.
    supportedTypes: ['string'],
    getAllKeys: () => driver.getAllKeys(),
    getItem: (key) => driver.getItem(key),
    getMany: hasGetMany || hasMultiGet ? readMany : undefined,
    setItem: hasSet
      ? async (key, text) => {
          await driver.setItem?.(key, text);
        }
      : undefined,
    removeItem: hasRemove
      ? async (key) => {
          await driver.removeItem?.(key);
        }
      : undefined,
  });
}

/**
 * The parts of `react-native-mmkv` this package uses — pass your MMKV instance as `driver`. Both
 * majors fit: MMKV 4's `remove` and 2/3's `delete` are both accepted.
 *
 * MMKV cannot say what type a key holds, so the typed getters are probed in turn; declare the ones
 * your instance has and values come back as the types they were written as.
 */
export type MmkvLikeDriver = {
  /** Lists every key in the instance. */
  getAllKeys: () => readonly string[];
  /** Reads a string value; `undefined` for an absent key. The one required read. */
  getString: (key: string) => string | undefined;
  /** Reads a number value. Without it, stored numbers surface as strings. */
  getNumber?: (key: string) => number | undefined;
  /** Reads a boolean value. Without it, stored booleans surface as strings. */
  getBoolean?: (key: string) => boolean | undefined;
  /**
   * Structural rather than `ArrayBuffer` or `Uint8Array`: MMKV 4 returns the former where 2 and 3
   * returned the latter, and the byte length is the only part of it this tab reports anyway.
   */
  getBuffer?: (key: string) => { byteLength: number } | undefined;
  /** Writes a string, number or boolean. Omit to make the store read-only. */
  set?: (key: string, value: string | number | boolean) => unknown;
  /** MMKV 4 renamed `delete` to `remove`; both are accepted so either major works. */
  delete?: (key: string) => unknown;
  /** MMKV 4's delete. Either this or `delete` enables deleting. */
  remove?: (key: string) => unknown;
};

/**
 * Registers a `react-native-mmkv` instance, or anything copying its API, with the Storage tab.
 *
 * ```ts
 * storage: { adapters: [mmkvAdapter({ driver: mmkv, name: 'MMKV (cache)' })] }
 * ```
 *
 * `name` defaults to `'MMKV'`. Reads are synchronous and keep their types, so a number stays a
 * number when you edit it.
 */
export function mmkvAdapter(config: {
  driver: MmkvLikeDriver;
  name?: string;
  readOnly?: boolean;
  blacklist?: StorageKeyBlacklist;
}): StorageAdapterDefinition {
  const { driver } = config;
  const hasSet = typeof driver.set === 'function';
  const hasRemove = typeof driver.remove === 'function' || typeof driver.delete === 'function';

  return defineStorageAdapter({
    name: config.name ?? 'MMKV',
    kind: 'sync',
    readOnly: config.readOnly,
    blacklist: config.blacklist,
    getAllKeys: () => driver.getAllKeys(),
    getItem: (key) => readMmkvValue(driver, key),
    setItem: hasSet
      ? (key, text, valueType) => writeMmkvValue(driver, key, text, valueType)
      : undefined,
    removeItem: hasRemove
      ? (key) => (driver.remove ? driver.remove(key) : driver.delete?.(key))
      : undefined,
  });
}

/**
 * MMKV has no "what type is this key" call, so the type is found by trying each getter in turn.
 * Every check is `!== undefined` rather than truthiness: a stored `0` and a stored `false` are
 * values, not misses, and reading them as misses would hide them from the whole tab.
 *
 * The order is not the obvious one, because the getters disagree with each other on the same key.
 * `getString` lenient-decodes bytes that are not valid UTF-8 to `''` on some platforms, and
 * `getNumber` reinterprets any 8-byte payload as an IEEE 754 double without regard for the
 * `setBuffer` that wrote it. `getBuffer` is the strict one — it answers for keys actually written as
 * bytes — so it is consulted ahead of both, and only a *non-empty* string is trusted before it. A
 * deliberate `setString(key, '')` is caught at the bottom, once a buffer at the same key is ruled
 * out. Bytes that happen to decode as valid UTF-8 still surface as a string; nothing can tell those
 * apart from a string that was written as one.
 */
function readMmkvValue(driver: MmkvLikeDriver, key: string): StorageReadResult {
  const text = driver.getString(key);
  if (text !== undefined && text.length > 0) return { text, valueType: 'string' };

  const buffer = driver.getBuffer?.(key);
  if (buffer !== undefined && buffer.byteLength > 0) {
    // Rendering the bytes would mean inventing an encoding for them; the length is the honest part.
    return { text: `${buffer.byteLength} bytes`, valueType: 'buffer' };
  }

  const numeric = driver.getNumber?.(key);
  if (numeric !== undefined) return { text: String(numeric), valueType: 'number' };

  const flag = driver.getBoolean?.(key);
  if (flag !== undefined) return { text: String(flag), valueType: 'boolean' };

  if (text !== undefined) return { text, valueType: 'string' };

  return { text: null, valueType: 'string' };
}

/** Writes back through the type the value was read as, so editing a number keeps it a number. */
function writeMmkvValue(
  driver: MmkvLikeDriver,
  key: string,
  text: string,
  valueType: StorageValueType
): void {
  if (valueType === 'buffer') {
    throw new Error('A binary value cannot be edited here.');
  }
  if (valueType === 'number') {
    const numeric = Number(text);
    if (text.trim().length === 0 || !Number.isFinite(numeric)) {
      throw new Error(`"${text}" is not a number, and this key holds one.`);
    }
    driver.set?.(key, numeric);
    return;
  }
  if (valueType === 'boolean') {
    if (text !== 'true' && text !== 'false') {
      throw new Error('This key holds a boolean — enter true or false.');
    }
    driver.set?.(key, text === 'true');
    return;
  }
  driver.set?.(key, text);
}

/**
 * The parts of `expo-secure-store` this package uses — pass the module itself as `driver`. `TOptions`
 * is its own options type, inferred from what you pass, so a `keychainService` or
 * `requireAuthentication` option type-checks the way it does in your own calls.
 *
 * The keychain cannot be listed, so `secureStoreAdapter` also needs a `keys` list.
 */
export type SecureStoreLikeDriver<TOptions = never> = {
  /** Reads one key; `null` for an absent one. The one required method. */
  getItemAsync: (key: string, options?: TOptions) => MaybePromise<string | null>;
  /** Writes one key. Omit to make the store read-only. */
  setItemAsync?: (key: string, value: string, options?: TOptions) => MaybePromise<unknown>;
  /** Deletes one key. Omit and the tab offers no delete. */
  deleteItemAsync?: (key: string, options?: TOptions) => MaybePromise<unknown>;
};

/**
 * Registers `expo-secure-store` with the Storage tab.
 *
 * It has no way to list what it holds — the keychain/keystore is addressed by key, not enumerated —
 * so you name the keys worth watching and the tab says that's what it's doing:
 *
 * ```ts
 * secureStoreAdapter({ driver: SecureStore, keys: ['session', 'pin'] })
 * ```
 *
 * `keys` also takes a function, resolved on every read, for an app that tracks its own key list.
 * `name` defaults to `'SecureStore'`, and `options` is passed through to every driver call.
 */
export function secureStoreAdapter<TOptions>(config: {
  driver: SecureStoreLikeDriver<TOptions>;
  keys: readonly string[] | (() => MaybePromise<readonly string[]>);
  name?: string;
  options?: TOptions;
  readOnly?: boolean;
  blacklist?: StorageKeyBlacklist;
}): StorageAdapterDefinition {
  const { driver, options } = config;
  const hasSet = typeof driver.setItemAsync === 'function';
  const hasDelete = typeof driver.deleteItemAsync === 'function';

  return defineStorageAdapter({
    name: config.name ?? 'SecureStore',
    kind: 'async',
    readOnly: config.readOnly,
    keys: config.keys,
    blacklist: config.blacklist,
    // The keychain stores strings; a number written here comes back as its own text.
    supportedTypes: ['string'],
    getItem: (key) => driver.getItemAsync(key, options),
    setItem: hasSet
      ? async (key, text) => {
          await driver.setItemAsync?.(key, text, options);
        }
      : undefined,
    removeItem: hasDelete
      ? async (key) => {
          await driver.deleteItemAsync?.(key, options);
        }
      : undefined,
  });
}

function slugify(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug.length > 0 ? slug : 'store';
}

/**
 * Assigns the ids and folds the global `readOnly` default in. Ids are handed out here rather than in
 * the factories because a collision can only be seen across the whole list.
 */
export function resolveStorageAdapters(
  definitions: readonly StorageAdapterDefinition[],
  options?: { readOnly?: boolean }
): StorageAdapter[] {
  const taken = new Set<string>();

  return definitions.map((definition) => {
    const base = slugify(definition.name);
    let id = base;
    let suffix = 2;
    while (taken.has(id)) {
      id = `${base}-${suffix}`;
      suffix += 1;
    }
    taken.add(id);

    const readOnly = definition.readOnly ?? options?.readOnly ?? false;

    return {
      ...definition,
      id,
      readOnly,
      canEdit: !readOnly && definition.setItem !== undefined,
      canDelete: !readOnly && definition.removeItem !== undefined,
    };
  });
}

/** A binary value is shown but never edited — there is no text form of it to round-trip. */
export function isEditableValueType(valueType: StorageValueType): boolean {
  return valueType !== 'buffer';
}

/**
 * The types a new key can be created as: what the store can hold, minus what cannot be typed. Asking
 * the store first is what keeps the editor from offering a number to a store that would hand it back
 * as text.
 */
export function creatableValueTypes(adapter: StorageAdapter): StorageValueType[] {
  return adapter.supportedTypes.filter(isEditableValueType);
}
