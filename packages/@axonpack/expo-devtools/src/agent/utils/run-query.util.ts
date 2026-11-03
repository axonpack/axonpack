import type { AgentTopic } from '../constants/agent-topics.const';

/** What the CLI sends: one key per flag, already parsed. */
export type AgentQuery = {
  topic: string;
  /** `get <topic> <id>`: that one row, whole. */
  get?: string;
  /** Text, or `/regex/flags`, matched against every value in the row. */
  grep?: string;
  /** Each is `<field><op><value>` or `<field>?`, and all of them must hold. */
  where?: string[];
  /** `30s`, `10m`, `2h`, `1d` or an ISO time, on the device clock. */
  since?: string;
  until?: string;
  /** Rows that arrived after this id. The list then reads forward in time from it. */
  after?: string;
  /** Rows that arrived before this id. */
  before?: string;
  limit?: number;
  /** A field, or `-field` for descending. Without it, newest first. */
  sort?: string;
  /** A comma list of fields. Without it, the topic's `show`. */
  fields?: string;
  count?: boolean;
  groupBy?: string;
  /** Strings whole rather than cut at 2 KB. */
  full?: boolean;
  /** JSON lines instead of TSV, with no `#` lines. */
  json?: boolean;
};

type Getter = (row: unknown) => unknown;
type Test = (row: unknown) => boolean;

const CUT_AT = 2048;
const DEFAULT_LIMIT = 50;
const UNIT_MS: Record<string, number> = { ms: 1, s: 1e3, m: 60e3, h: 3600e3, d: 86400e3 };
// Two-character ops first, so `>=` is not read as `>` with a value of `=...`.
const WHERE_CLAUSE = /^([\w.-]+)(!=|>=|<=|!~|=|>|<|~)([\s\S]*)$/;
const HAS_VALUE = /^([\w.-]+)\?$/;
const REGEX = /^\/([\s\S]+)\/([a-z]*)$/;
const TSV_ESCAPES: Record<string, string> = { '\t': '\\t', '\n': '\\n', '\r': '\\r' };

/** The finished text, and for a list, count or `get` how many rows it matched of all the topic kept. */
export type AgentReply = { text: string; matched?: number; total?: number };

/**
 * Answers one agent query. Never throws: the caller is a debugger evaluate, so a bad query comes
 * back as one `error:` line and the app never notices it.
 */
export function runQuery(topics: readonly AgentTopic[], query: AgentQuery): AgentReply {
  try {
    return answer(topics, query);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { text: `error: ${message.split('\n')[0]}` };
  }
}

function answer(topics: readonly AgentTopic[], query: AgentQuery): AgentReply {
  const topic = topics.find((each) => each.name === query?.topic);
  if (!topic) {
    // An agent that passed the whole command as one argument, so its flags never reached the CLI.
    if (/\s/.test(query?.topic ?? '')) {
      throw new Error(
        `"${query.topic}" isn't a topic. Pass the topic and each flag as separate arguments: devtools ${query.topic.trim()}`
      );
    }
    const names = topics.map((each) => each.name).join(', ') || 'none yet';
    throw new Error(`unknown topic "${query?.topic}". Topics: ${names}`);
  }
  if (topic.enabled?.() === false) {
    return {
      text: `# ${topic.name} is off: ${topic.off ?? 'the app turned it off in its devtools config'}`,
    };
  }
  const waitFor = topic.prepare?.(query);
  if (waitFor) return { text: `# wait: ${waitFor}` };

  const rows = topic.rows();
  const id = topic.fields.id;
  const full = query.full === true;
  const field = (name: string): Getter => {
    // Not `name in fields`, which would hand `toString` back as a getter.
    if (!Object.prototype.hasOwnProperty.call(topic.fields, name)) {
      const known = Object.keys(topic.fields).join(', ');
      throw new Error(`unknown field "${name}" in ${topic.name}. Fields: ${known}`);
    }
    return topic.fields[name];
  };
  const indexOf = (rowId: string) => {
    const index = rows.findIndex((row) => id(row) === rowId);
    if (index === -1) {
      throw new Error(`no ${topic.name} row "${rowId}", it may have aged out of the buffer`);
    }
    return index;
  };

  if (query.get !== undefined) {
    const row = rows[indexOf(query.get)];
    const shown = topic.detail ? topic.detail(row, full) : row;
    const text = JSON.stringify(shown, cutStrings(full), query.json ? undefined : 2);
    return {
      text: query.json ? text : `# ${topic.name} ${query.get}\n${text}`,
      matched: 1,
      total: rows.length,
    };
  }

  const limit = query.limit ?? DEFAULT_LIMIT;
  if (!Number.isInteger(limit) || limit < 1) {
    throw new Error(`bad --limit ${limit}: use a whole number from 1`);
  }
  const columns =
    query.fields
      ?.split(',')
      .map((name) => name.trim())
      .filter(Boolean) ?? topic.show;
  const getters = columns.map(field);

  const tests: Test[] = (query.where ?? []).map((clause) => whereTest(clause, field));
  if (query.grep) {
    const match = textTest(query.grep);
    tests.push((row) => someValue(row, match));
  }
  if (query.since) {
    const from = toTime(query.since, 'since');
    tests.push((row) => (topic.fields.t(row) ?? -Infinity) >= from);
  }
  if (query.until) {
    const to = toTime(query.until, 'until');
    tests.push((row) => (topic.fields.t(row) ?? Infinity) <= to);
  }

  // Rows are newest first, so a larger index is older.
  const start = query.before === undefined ? 0 : indexOf(query.before) + 1;
  const end = query.after === undefined ? rows.length : indexOf(query.after);
  const hits: number[] = [];
  for (let i = start; i < end; i++) if (tests.every((test) => test(rows[i]))) hits.push(i);

  const done = (text: string): AgentReply => ({ text, matched: hits.length, total: rows.length });
  if (query.count) return done(String(hits.length));
  const summary = `# ${topic.name} · ${hits.length} of ${rows.length} match`;

  if (query.groupBy !== undefined) {
    const name = query.groupBy;
    const get = field(name);
    const groups = new Map<string, { value: unknown; count: number }>();
    for (const i of hits) {
      const value = get(rows[i]);
      const key = isEmpty(value) ? '' : asText(value);
      const group = groups.get(key) ?? { value, count: 0 };
      group.count++;
      groups.set(key, group);
    }
    const top = [...groups.values()].sort((a, b) => b.count - a.count).slice(0, limit);
    if (query.json) {
      return done(
        top
          .map((group) =>
            JSON.stringify({ [name]: group.value ?? null, count: group.count }, cutStrings(full))
          )
          .join('\n')
      );
    }
    return done(
      [
        `${summary} · ${groups.size} values of ${name}`,
        `${name}\tcount`,
        ...top.map((group) => `${cell(name, group.value, full)}\t${group.count}`),
      ].join('\n')
    );
  }

  const sort = query.sort;
  const sorted = sort !== undefined;
  if (sorted) {
    const get = field(sort.replace(/^-/, ''));
    hits.sort((a, b) => compare(get(rows[a]), get(rows[b]), sort.startsWith('-')));
  }
  // From a cursor the list reads forward in time, so the rows closest to it come first and paging
  // with `next` leaves no gap.
  const forward = !sorted && query.after !== undefined;
  const page = forward ? hits.slice(-limit).reverse() : hits.slice(0, limit);

  if (query.json) {
    return done(
      page
        .map((i) => {
          const values = Object.fromEntries(columns.map((name, k) => [name, getters[k](rows[i])]));
          return JSON.stringify(values, cutStrings(full));
        })
        .join('\n')
    );
  }

  const lines = [
    page.length < hits.length ? `${summary} · showing ${page.length}` : summary,
    columns.join('\t'),
    ...page.map((i) => columns.map((name, k) => cell(name, getters[k](rows[i]), full)).join('\t')),
  ];
  // A sorted page is not a run of time, so no cursor can continue it.
  if (!sorted) {
    const next = nextCursor();
    if (next !== undefined) lines.push(`# next: --after ${next}`);
    if (!forward && hits.length > page.length) {
      lines.push(`# more: --before ${id(rows[page[page.length - 1]])}`);
    }
  }
  return done(lines.join('\n'));

  /**
   * The newest row this reply covered, unless a row in flight sits in that stretch: then the row
   * just older than it, so the next poll shows how it ended. The stretch counts rows the filters
   * dropped too, since a request with no status yet can still end in a 500. It runs to the end of
   * the window unless the limit cut older matches off, which `more` pages to instead.
   */
  function nextCursor(): string | undefined {
    const newest = page.length ? Math.min(...page) : start;
    const oldest = forward || page.length === hits.length ? end - 1 : Math.max(...page);
    if (newest > oldest) return query.after;
    for (let i = oldest; i >= newest; i--) {
      if (topic!.pending?.(rows[i])) return i + 1 < rows.length ? id(rows[i + 1]) : undefined;
    }
    return id(rows[newest]);
  }
}

function whereTest(clause: string, field: (name: string) => Getter): Test {
  const has = HAS_VALUE.exec(clause);
  if (has) {
    const get = field(has[1]);
    return (row) => !isEmpty(get(row));
  }
  const parts = WHERE_CLAUSE.exec(clause);
  if (!parts) {
    throw new Error(
      `bad --where "${clause}": use <field><op><value> with = != > >= < <= ~ !~, or <field>?`
    );
  }
  const [, name, op, value] = parts;
  // `==`, `=~` and the like would otherwise pass as `=` against a value starting with `=`.
  if (/^[=~<>]/.test(value)) {
    throw new Error(
      `bad --where "${clause}": unknown op "${op}${value[0]}". Ops: = != > >= < <= ~ !~`
    );
  }
  const get = field(name);

  if (op[0] === '<' || op[0] === '>') {
    const bound = Number(value);
    if (value.trim() === '' || Number.isNaN(bound)) {
      throw new Error(`bad --where "${clause}": ${op} needs a number`);
    }
    return (row) => {
      const v = get(row);
      const n = isEmpty(v) ? NaN : Number(v);
      if (op === '>') return n > bound;
      if (op === '>=') return n >= bound;
      if (op === '<') return n < bound;
      return n <= bound;
    };
  }

  // A regex may hold a comma of its own, so only a plain value splits into an any-of list.
  const options = REGEX.test(value) ? [value] : value.split(',');
  const matchers = op.endsWith('~')
    ? options.map(textTest)
    : options.map((option) => {
        const want = option.toLowerCase();
        return (text: string) => text.toLowerCase() === want;
      });
  const negate = op[0] === '!';
  return (row) => {
    const v = get(row);
    const hit = v != null && matchers.some((match) => match(asText(v)));
    return hit !== negate;
  };
}

/** Case-insensitive contains, or a `/regex/flags`. */
function textTest(pattern: string): (text: string) => boolean {
  const regex = REGEX.exec(pattern);
  if (!regex) {
    const needle = pattern.toLowerCase();
    return (text) => text.toLowerCase().includes(needle);
  }
  let compiled: RegExp;
  try {
    // `g` and `y` make `test` resume from where it last stopped, which would skip rows.
    compiled = new RegExp(regex[1], regex[2].replace(/[gy]/g, ''));
  } catch (error) {
    throw new Error(`bad regex ${pattern}: ${(error as Error).message}`);
  }
  return (text) => compiled.test(text);
}

/** Values only, not keys: every row has a `status` key, so a key match would hit them all. */
function someValue(value: unknown, match: (text: string) => boolean): boolean {
  if (value == null) return false;
  if (typeof value !== 'object') return match(String(value));
  return Object.values(value).some((each) => someValue(each, match));
}

function toTime(value: string, flag: string): number {
  const relative = /^(\d+(?:\.\d+)?)(ms|s|m|h|d)$/.exec(value);
  if (relative) return Date.now() - Number(relative[1]) * UNIT_MS[relative[2]];
  const time = Date.parse(value);
  if (Number.isNaN(time)) {
    throw new Error(`bad --${flag} "${value}": use 30s, 10m, 2h, 1d or an ISO time`);
  }
  return time;
}

/** Rows without the value go last in either direction. */
function compare(left: unknown, right: unknown, descending: boolean): number {
  if (isEmpty(left) || isEmpty(right)) return Number(isEmpty(left)) - Number(isEmpty(right));
  let order: number;
  if (typeof left === 'number' && typeof right === 'number') {
    order = left - right;
  } else {
    const a = asText(left);
    const b = asText(right);
    order = a < b ? -1 : a > b ? 1 : 0;
  }
  return descending ? -order : order;
}

function cell(name: string, value: unknown, full: boolean): string {
  if (isEmpty(value)) return '-';
  const text =
    name === 't' && typeof value === 'number' && Number.isFinite(value)
      ? new Date(value).toISOString()
      : asText(value);
  return cut(text, full).replace(/[\t\n\r]/g, (char) => TSV_ESCAPES[char]);
}

function cut(text: string, full: boolean): string {
  if (full || text.length <= CUT_AT) return text;
  return `${text.slice(0, CUT_AT)}... [cut at ${CUT_AT} of ${text.length} chars, --full for all]`;
}

function cutStrings(full: boolean) {
  return (_key: string, value: unknown) => (typeof value === 'string' ? cut(value, full) : value);
}

function asText(value: unknown): string {
  return typeof value === 'string' ? value : JSON.stringify(value);
}

function isEmpty(value: unknown): boolean {
  return value == null || value === '';
}
