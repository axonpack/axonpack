import { getCached, setCached } from "./cache";
import { activeMock } from "./mock";
import { providerKey, runProvider } from "./resolve";
import { getVersionInfo } from "./source";
import type { GetLatestVersionOption, ProviderResult } from "./types";

const DEFAULT_TTL_MS = 300_000;

/** Same result as `getLatestVersion`, with the store URL, notes and minimum version. */
export const fetchLatest = async (
  option: GetLatestVersionOption = {},
): Promise<ProviderResult> => {
  const mock = activeMock(option);
  if (mock?.latestVersion) return { ...mock, version: mock.latestVersion };
  const ttl = option.cacheTtlMs ?? DEFAULT_TTL_MS;
  const key = [
    providerKey(option.provider),
    option.platform,
    option.country,
    option.packageName ?? getVersionInfo().getPackageName(),
  ].join("|");
  // A custom provider has no stable identity to key on, so it is never cached.
  const cacheable =
    ttl > 0 && !option.forceUpdate && providerKey(option.provider) !== "custom";
  if (cacheable) {
    const hit = getCached<ProviderResult>(key, ttl);
    if (hit) return hit;
  }
  const result = await runProvider(option);
  if (ttl > 0 && providerKey(option.provider) !== "custom")
    setCached(key, result);
  return result;
};

/** Runs `work`, and on failure either warns and resolves undefined (the default) or rethrows. */
export const guard = async <T>(
  ignoreErrors: boolean | undefined,
  work: () => Promise<T>,
) => {
  try {
    return await work();
  } catch (error) {
    if (ignoreErrors ?? true) {
      console.warn(error);
      return undefined;
    }
    throw error;
  }
};

export function getLatestVersion(
  option: GetLatestVersionOption & { ignoreErrors: false },
): Promise<string>;
export function getLatestVersion(
  option?: GetLatestVersionOption,
): Promise<string | undefined>;
export function getLatestVersion(option: GetLatestVersionOption = {}) {
  return guard(
    option.ignoreErrors,
    async () => (await fetchLatest(option)).version,
  );
}
