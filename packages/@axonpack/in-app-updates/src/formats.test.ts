import { describe, expect, test } from "bun:test";

import { InvalidVersionError } from "./errors";
import { evaluateUpdate } from "./need-update";
import { compareVersions } from "./semver";

// [installed, store, is the store version newer]
const NEWER: [string, string, boolean][] = [
  // plain numbers
  ["1", "2", true],
  ["1.2", "1.10", true],
  ["1.2.3", "1.2.3", false],
  ["1.2", "1.2.0", false],
  ["1.2.3.4", "1.2.3.5", true],
  ["2.0.0", "1.9.9", false],
  ["v1.2.3", "1.2.4", true],
  // calendar versions and dates
  ["2024.10.1", "2024.10.12", true],
  ["2024-10-12", "2024-11-02", true],
  ["2024-11-02", "2024-10-12", false],
  ["20241012", "20241101", true],
  // prerelease, beta, canary
  ["1.2.3-beta", "1.2.3", true],
  ["1.2.3", "1.2.3-beta", false],
  ["1.2.3-beta.2", "1.2.3-beta.10", true],
  ["1.2.3-rc2", "1.2.3-rc10", true],
  ["1.2.3beta", "1.2.3", true],
  ["1.2.3-canary.5", "1.2.3-canary.6", true],
  ["1.2.3-canary.5", "1.2.3-beta.1", true],
  ["1.2.3-rc.1", "1.2.3-beta.9", false],
  ["1.2.3-dev", "1.2.3-nightly", true],
  ["1.2.3-nightly", "1.2.3-canary", true],
  ["1.2.3-canary", "1.2.3-alpha", true],
  ["1.2.3-alpha", "1.2.3-beta", true],
  ["1.2.3-beta", "1.2.3-rc", true],
  ["1.2.3-apple", "1.2.3-banana", true],
  ["1.2.3-canary", "1.2.4-canary", true],
  // labels and build metadata
  ["canary-1.2.3", "1.2.3", false],
  ["canary-1.2.3", "1.2.4", true],
  ["1.2.3+sha.abc", "1.2.3+sha.def", false],
  ["1.2.3-canary.5+sha.abc", "1.2.3-canary.5", false],
];

describe("which version counts as newer", () => {
  for (const [installed, store, expected] of NEWER) {
    test(`${installed} -> ${store} : ${expected ? "update" : "no update"}`, () => {
      expect(evaluateUpdate(installed, { version: store }).isNeeded).toBe(
        expected,
      );
    });
  }
});

const REJECTED = [
  "canary",
  "beta",
  "",
  "latest",
  "abc",
  "2.0 (build 5)",
  "1.2.3 final",
  "1..2",
];

describe("text the built-in parser cannot read", () => {
  for (const bad of REJECTED) {
    test(`"${bad}" throws InvalidVersionError`, () => {
      expect(() => compareVersions(bad, "1.0.0")).toThrow(InvalidVersionError);
    });
  }
});

describe("custom compare for formats the parser rejects", () => {
  const digits = (v: string) => Number(v.replace(/\D/g, ""));
  const compare = (a: string, b: string) => digits(a) - digits(b);

  const CUSTOM: [string, string, boolean][] = [
    ["2.0 (build 5)", "2.0 (build 9)", true],
    ["2.0 (build 9)", "2.0 (build 9)", false],
    ["2.0 (build 9)", "2.0 (build 5)", false],
    ["1.2.3 final", "1.2.4 final", true],
  ];
  for (const [installed, store, expected] of CUSTOM) {
    test(`${installed} -> ${store} : ${expected ? "update" : "no update"}`, () => {
      expect(
        evaluateUpdate(installed, { version: store }, { compare }).isNeeded,
      ).toBe(expected);
    });
  }

  test("minimumVersion and skipVersion use it too", () => {
    const forced = evaluateUpdate(
      "2.0 (build 5)",
      { version: "2.0 (build 9)" },
      { compare, minimumVersion: "2.0 (build 7)" },
    );
    expect(forced).toMatchObject({ isForced: true, isNeeded: true });
    const skipped = evaluateUpdate(
      "2.0 (build 5)",
      { version: "2.0 (build 9)" },
      { compare, skipVersion: "2.0 (build 9)" },
    );
    expect(skipped).toMatchObject({ isSkipped: true, isNeeded: false });
  });
});
