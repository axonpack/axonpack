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

export type StorageAdapterKind = 'async' | 'sync';

/** What the driver actually handed back, so a stored `1` doesn't render as the string `"1"`. */
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

export type StorageReadResult = {
  /** `null` is an absent key. `''` is a value — a store can legitimately hold an empty string. */
  text: string | null;
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

export type StorageAdapterConfig = {
  name: string;
  kind?: StorageAdapterKind;
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
  getAllKeys?: () => MaybePromise<readonly string[]>;
  getItem: (key: string) => MaybePromise<StorageReadValue>;
  /** A batch read, when the driver has one. Keys absent from the result are treated as unset. */
  getMany?: (keys: string[]) => MaybePromise<Map<string, StorageReadResult>>;
  setItem?: (key: string, text: string, valueType: StorageValueType) => MaybePromise<unknown>;
  removeItem?: (key: string) => MaybePromise<unknown>;
};

export type StorageAdapterDefinition = {
  name: string;
  kind: StorageAdapterKind;
  readOnly?: boolean;
  canEnumerate: boolean;
  supportedTypes: StorageValueType[];
  /** Resolved from `blacklist`; always present, and answers `false` when nothing was declared. */
  isHidden: (key: string) => boolean;
  hasBlacklist: boolean;
  getAllKeys: () => Promise<string[]>;
  getItem: (key: string) => Promise<StorageReadResult>;
  getMany?: (keys: string[]) => Promise<Map<string, StorageReadResult>>;
  setItem?: (key: string, text: string, valueType: StorageValueType) => Promise<void>;
  removeItem?: (key: string) => Promise<void>;
};

export type StorageAdapter = Omit<StorageAdapterDefinition, 'readOnly'> & {
  /** Slug of `name`, suffixed on collision — the stable key every store lookup goes through. */
  id: string;
  readOnly: boolean;
  canEdit: boolean;
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
 * The escape hatch every other factory below is written in terms of. It duck-types nothing — it
 * takes exactly what it is handed and only normalises sync answers to promises.
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

export type AsyncStorageLikeDriver = {
  getAllKeys: () => MaybePromise<readonly string[]>;
  getItem: (key: string) => MaybePromise<string | null>;
  /** The batch read as of async-storage 3. */
  getMany?: (keys: string[]) => MaybePromise<Record<string, string | null>>;
  /** The batch read in async-storage 1 and 2, kept because plenty of apps are still there. */
  multiGet?: (keys: string[]) => MaybePromise<readonly (readonly [string, string | null])[]>;
  setItem?: (key: string, value: string) => MaybePromise<unknown>;
  removeItem?: (key: string) => MaybePromise<unknown>;
};

/**
 * `@react-native-async-storage/async-storage` and anything copying its API.
 *
 * Every call goes through the driver object rather than a destructured reference: a driver method
 * may well be bound to a native instance, and pulling it off the object would strand `this`.
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

export type MmkvLikeDriver = {
  getAllKeys: () => readonly string[];
  getString: (key: string) => string | undefined;
  getNumber?: (key: string) => number | undefined;
  getBoolean?: (key: string) => boolean | undefined;
  /**
   * Structural rather than `ArrayBuffer` or `Uint8Array`: MMKV 4 returns the former where 2 and 3
   * returned the latter, and the byte length is the only part of it this tab reports anyway.
   */
  getBuffer?: (key: string) => { byteLength: number } | undefined;
  set?: (key: string, value: string | number | boolean) => unknown;
  /** MMKV 4 renamed `delete` to `remove`; both are accepted so either major works. */
  delete?: (key: string) => unknown;
  remove?: (key: string) => unknown;
};

/** `react-native-mmkv` and anything copying its API. */
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

export type SecureStoreLikeDriver<TOptions = never> = {
  getItemAsync: (key: string, options?: TOptions) => MaybePromise<string | null>;
  setItemAsync?: (key: string, value: string, options?: TOptions) => MaybePromise<unknown>;
  deleteItemAsync?: (key: string, options?: TOptions) => MaybePromise<unknown>;
};

/**
 * `expo-secure-store`. It has no way to list what it holds — the keychain/keystore is addressed by
 * key, not enumerated — so you name the keys worth watching and the tab says that's what it's doing.
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
