/** Params typed as JSON, as both Open screen forms take them. Empty means none. */
export function parseParams(text: string): { params?: Record<string, unknown>; error?: string } {
  const trimmed = text.trim();
  if (trimmed.length === 0) return {};
  try {
    const parsed: unknown = JSON.parse(trimmed);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return { error: 'Params must be a JSON object.' };
    }
    return { params: parsed as Record<string, unknown> };
  } catch {
    return { error: 'Params are not valid JSON.' };
  }
}
