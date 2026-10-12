const entries = new Map<string, { at: number; value: unknown }>();

export const getCached = <T>(key: string, ttlMs: number): T | undefined => {
  const hit = entries.get(key);
  if (!hit || Date.now() - hit.at >= ttlMs) return undefined;
  return hit.value as T;
};

export const setCached = (key: string, value: unknown): void => {
  entries.set(key, { at: Date.now(), value });
};

export const clearCache = (): void => entries.clear();
