import { InvalidVersionError } from "./errors";
import {
  compareVersions,
  diffVersions,
  isGreater,
  satisfiesMinimum,
  truncateVersion,
} from "./semver";

test("compares numerically, not as strings", () => {
  expect(compareVersions("1.10.0", "1.9.0")).toBe(1);
  expect(compareVersions("2.0.0", "10.0.0")).toBe(-1);
});

test("pads short and long versions", () => {
  expect(compareVersions("1.2", "1.2.0")).toBe(0);
  expect(compareVersions("1", "1.0.0.0")).toBe(0);
  expect(compareVersions("1.2.3.4", "1.2.3")).toBe(1);
});

test("a leading v and build metadata are ignored", () => {
  expect(compareVersions("v1.2.3", "1.2.3+99")).toBe(0);
});

test("prerelease ranks below the release and orders by semver rules", () => {
  expect(compareVersions("1.0.0-beta", "1.0.0")).toBe(-1);
  expect(compareVersions("1.0.0-beta.2", "1.0.0-beta.10")).toBe(-1);
  expect(compareVersions("1.0.0-alpha", "1.0.0-beta")).toBe(-1);
  expect(compareVersions("1.0.0-1", "1.0.0-alpha")).toBe(-1);
  expect(compareVersions("1.0.0-beta", "1.0.0-beta.1")).toBe(-1);
});

test("rejects garbage", () => {
  expect(() => compareVersions("abc", "1.0.0")).toThrow(InvalidVersionError);
  expect(() => compareVersions("1.0.0", "")).toThrow(InvalidVersionError);
});

test("isGreater and satisfiesMinimum", () => {
  expect(isGreater("1.0.1", "1.0.0")).toBe(true);
  expect(satisfiesMinimum("1.0.0", "1.0.0")).toBe(true);
  expect(satisfiesMinimum("0.9.9", "1.0.0")).toBe(false);
});

test("truncateVersion keeps depth segments and zero-fills", () => {
  expect(truncateVersion("1.2.9", 2)).toBe("1.2.0");
  expect(truncateVersion("1.2.9", 1)).toBe("1.0.0");
  expect(truncateVersion("1.2.9", Infinity)).toBe("1.2.9");
});

test("diffVersions names the biggest change", () => {
  expect(diffVersions("1.0.0", "2.0.0")).toBe("major");
  expect(diffVersions("1.0.0", "1.1.0")).toBe("minor");
  expect(diffVersions("1.0.0", "1.0.1")).toBe("patch");
  expect(diffVersions("1.0.0-beta", "1.0.0")).toBe("prerelease");
  expect(diffVersions("1.0.0", "1.0.0")).toBe("none");
  expect(diffVersions("2.0.0", "1.0.0")).toBe("none");
});

test("release tags without a dash, glued to digits, or in front are read", () => {
  expect(compareVersions("1.2.3beta", "1.2.3")).toBe(-1);
  expect(compareVersions("1.2.3-rc2", "1.2.3-rc10")).toBe(-1);
  expect(compareVersions("canary-1.2.3", "1.2.3")).toBe(0);
  expect(compareVersions("1.2.3-canary.5+sha.abc", "1.2.3-canary.5")).toBe(0);
});

test("known stages sort in shipping order, other words alphabetically", () => {
  const order = [
    "1.0.0-dev",
    "1.0.0-nightly",
    "1.0.0-canary",
    "1.0.0-alpha",
    "1.0.0-beta",
    "1.0.0-rc",
    "1.0.0",
  ];
  for (let i = 1; i < order.length; i++)
    expect(compareVersions(order[i - 1]!, order[i]!)).toBe(-1);
  expect(compareVersions("1.0.0-apple", "1.0.0-banana")).toBe(-1);
});

test("a version with no number is still rejected", () => {
  expect(() => compareVersions("canary", "1.0.0")).toThrow(InvalidVersionError);
});
