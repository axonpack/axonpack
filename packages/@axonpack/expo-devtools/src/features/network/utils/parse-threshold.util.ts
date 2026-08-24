/**
 * The thresholds are typed on a phone, so they take the units someone would say out loud: `2mb`
 * rather than 2097152, `1.5s` rather than 1500. A bare number keeps the field's own unit — bytes for a
 * size, milliseconds for a duration — because that is what the column beside it shows.
 *
 * `null` means unreadable, and an unreadable threshold is ignored rather than matching nothing: a
 * field halfway through being typed should not empty the list.
 */
const SIZE_UNITS: Record<string, number> = {
  '': 1,
  b: 1,
  k: 1024,
  kb: 1024,
  m: 1024 * 1024,
  mb: 1024 * 1024,
  g: 1024 * 1024 * 1024,
  gb: 1024 * 1024 * 1024,
};

const DURATION_UNITS: Record<string, number> = {
  '': 1,
  ms: 1,
  s: 1000,
  sec: 1000,
  m: 60_000,
  min: 60_000,
};

function parseWithUnits(text: string, units: Record<string, number>): number | null {
  const match = /^(\d+(?:\.\d+)?)\s*([a-z]*)$/.exec(text.trim().toLowerCase());
  if (!match) return null;

  const factor = units[match[2]];
  if (factor === undefined) return null;

  const value = Number(match[1]) * factor;
  return Number.isFinite(value) ? value : null;
}

/** Bytes. `500`, `20kb`, `1.5mb`. */
export function parseByteSize(text: string): number | null {
  return parseWithUnits(text, SIZE_UNITS);
}

/** Milliseconds. `250`, `800ms`, `1.5s`, `2min`. */
export function parseDurationMs(text: string): number | null {
  return parseWithUnits(text, DURATION_UNITS);
}
