/**
 * A status filter as an expression rather than one band. A chip per band answers "show me the
 * failures" in one tap and nothing else — `>= 400` is the question actually being asked, and a band
 * cannot express it, nor can it express one code, nor a range that crosses a hundred.
 *
 * The chips still exist and write into the same field: they are presets of this expression, so there
 * is one status filter rather than two that have to be reconciled.
 */
export type ParsedStatusQuery =
  | { kind: 'code'; code: number }
  | { kind: 'band'; band: number }
  | { kind: 'range'; min: number; max: number }
  | { kind: 'compare'; op: '>' | '>=' | '<' | '<='; code: number }
  /** The two states a request can be in with no code of its own to compare. */
  | { kind: 'state'; state: 'failed' | 'pending' };

/**
 * `null` for anything this cannot read — including a half-typed `>=`, which is why an unreadable
 * expression is ignored rather than matching nothing: emptying the list on the way to a valid filter
 * reads as the filter being broken. The field says it is invalid instead.
 */
export function parseStatusQuery(query: string): ParsedStatusQuery | null {
  const text = query.trim().toLowerCase();
  if (text.length === 0) return null;

  if (text === 'failed' || text === 'pending') return { kind: 'state', state: text };

  const band = /^([1-5])xx$/.exec(text);
  if (band) return { kind: 'band', band: Number(band[1]) };

  const range = /^(\d{3})\s*-\s*(\d{3})$/.exec(text);
  if (range) {
    const min = Number(range[1]);
    const max = Number(range[2]);
    return min <= max ? { kind: 'range', min, max } : { kind: 'range', min: max, max: min };
  }

  const compare = /^(>=|<=|>|<)\s*(\d{3})$/.exec(text);
  if (compare) {
    return { kind: 'compare', op: compare[1] as '>' | '>=' | '<' | '<=', code: Number(compare[2]) };
  }

  const code = /^\d{3}$/.exec(text);
  if (code) return { kind: 'code', code: Number(text) };

  return null;
}

/** What the entry has to answer with: a code, or the fact that it has none yet or never will. */
export type StatusFacts = {
  statusCode?: number;
  failed: boolean;
  pending: boolean;
};

export function matchesStatusQuery(facts: StatusFacts, query: ParsedStatusQuery): boolean {
  if (query.kind === 'state') {
    return query.state === 'failed' ? facts.failed : facts.pending;
  }

  // Every other kind compares a code, so an entry without one cannot match — a pending request is not
  // a 200 that has not arrived yet.
  const code = facts.statusCode;
  if (code === undefined) return false;

  switch (query.kind) {
    case 'code':
      return code === query.code;
    case 'band':
      return Math.floor(code / 100) === query.band;
    case 'range':
      return code >= query.min && code <= query.max;
    case 'compare':
      if (query.op === '>') return code > query.code;
      if (query.op === '>=') return code >= query.code;
      if (query.op === '<') return code < query.code;
      return code <= query.code;
  }
}
