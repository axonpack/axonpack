import { InvalidVersionError } from "./errors";

export type ParsedVersion = {
  /** Numeric segments. Any count: "1.2" and "1.2.3.4" both parse. */
  parts: number[];
  prerelease: string[];
  build: string[];
};

export type UpdateType =
  "none" | "major" | "minor" | "patch" | "prerelease" | "build";

// Numbers, then an optional tag: "-beta.2", "-rc1", "_canary", or letters straight after the digits
// ("1.2.3beta"). Build metadata after "+" is split off first.
const PATTERN =
  /^(\d+(?:\.\d+)*)(?:-([0-9A-Za-z._-]+)|[_.]?([A-Za-z][0-9A-Za-z._-]*))?$/;

// A label in front ("v1.2.3", "canary-1.2.3") is not part of the version.
const LABEL = /^(?:v|[A-Za-z]+[-_ ])(?=\d)/i;

// "rc10" becomes rc, 10, so rc2 sorts before rc10.
const tokens = (tag: string): string[] =>
  tag.split(/[._-]+|(?<=[A-Za-z])(?=\d)|(?<=\d)(?=[A-Za-z])/).filter(Boolean);

/** Lenient on purpose: stores and app configs ship "1", "1.2" and "1.2.3.4" as well as strict semver. */
export const parseVersion = (input: string): ParsedVersion => {
  // A plain date is read as year.month.day, not as "2024" with a prerelease "10-12".
  const date =
    typeof input === "string"
      ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(input.trim())
      : null;
  if (date)
    return {
      parts: [Number(date[1]), Number(date[2]), Number(date[3])],
      prerelease: [],
      build: [],
    };
  if (typeof input !== "string") throw new InvalidVersionError(input);

  const [core = "", ...build] = input.trim().replace(LABEL, "").split("+");
  const match = PATTERN.exec(core);
  if (!match) throw new InvalidVersionError(input);
  const tag = match[2] ?? match[3];
  return {
    parts: match[1]!.split(".").map(Number),
    prerelease: tag ? tokens(tag) : [],
    build: build.join("+").split(".").filter(Boolean),
  };
};

// Pre-release stages in the order they ship. Words not listed fall back to alphabetical.
const STAGES = [
  "dev",
  "nightly",
  "canary",
  "alpha",
  "beta",
  "preview",
  "pre",
  "rc",
];

const compareWords = (x: string, y: string): number => {
  const a = STAGES.indexOf(x.toLowerCase());
  const b = STAGES.indexOf(y.toLowerCase());
  if (a !== -1 && b !== -1) return a - b;
  return x < y ? -1 : x > y ? 1 : 0;
};

const comparePrerelease = (a: string[], b: string[]): number => {
  // A release outranks any prerelease of the same numbers.
  if (!a.length || !b.length)
    return a.length === b.length ? 0 : a.length ? -1 : 1;
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = a[i];
    const y = b[i];
    if (x === undefined) return -1;
    if (y === undefined) return 1;
    const xNum = /^\d+$/.test(x);
    const yNum = /^\d+$/.test(y);
    if (xNum && yNum) {
      if (Number(x) !== Number(y)) return Number(x) < Number(y) ? -1 : 1;
    } else if (xNum !== yNum) {
      return xNum ? -1 : 1;
    } else if (x !== y) {
      const word = compareWords(x, y);
      if (word) return word < 0 ? -1 : 1;
    }
  }
  return 0;
};

/** Build metadata (`+5`) is ignored, as semver says. Use buildNumber options to compare builds. */
export const compareVersions = (a: string, b: string): -1 | 0 | 1 => {
  const x = parseVersion(a);
  const y = parseVersion(b);
  for (let i = 0; i < Math.max(x.parts.length, y.parts.length); i++) {
    const p = x.parts[i] ?? 0;
    const q = y.parts[i] ?? 0;
    if (p !== q) return p < q ? -1 : 1;
  }
  const pre = comparePrerelease(x.prerelease, y.prerelease);
  return pre < 0 ? -1 : pre > 0 ? 1 : 0;
};

export const isGreater = (a: string, b: string): boolean =>
  compareVersions(a, b) > 0;

/** True when `version` is at least `minimum`. */
export const satisfiesMinimum = (version: string, minimum: string): boolean =>
  compareVersions(version, minimum) >= 0;

/**
 * Compares only the first `depth` numeric segments: depth 2 treats 1.2.9 and 1.2.0 as equal.
 */
export const truncateVersion = (version: string, depth: number): string => {
  const { parts } = parseVersion(version);
  if (!Number.isFinite(depth) || depth >= parts.length) return version.trim();
  const kept = parts.slice(0, Math.max(depth, 0));
  while (kept.length < 3) kept.push(0);
  return kept.join(".");
};

/** How far `latest` is ahead of `current`. */
export const diffVersions = (current: string, latest: string): UpdateType => {
  if (compareVersions(latest, current) <= 0) return "none";
  const x = parseVersion(current).parts;
  const y = parseVersion(latest).parts;
  const names = ["major", "minor", "patch"] as const;
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    if ((x[i] ?? 0) !== (y[i] ?? 0)) return names[i] ?? "patch";
  }
  return "prerelease";
};
