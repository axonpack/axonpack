import { IndexEntry, PlatformIndex } from "../core/layout";
import {
  indexesListing,
  removePreview,
  syncRootVersion,
  upsertPreview,
} from "./indexes";

const entry = (
  id: string,
  publishedAt: string,
  extra: Partial<IndexEntry> = {},
): IndexEntry => ({
  id,
  title: id,
  branch: id,
  commit: "abc1234",
  author: "Dev",
  publishedAt,
  appVersion: "1.0.0",
  buildNumber: "1",
  revision: `r-${id}`,
  size: 10,
  changelog: "",
  manifest: `previews/android/fp/${id}.json`,
  ...extra,
});

test("adds new previews newest first", () => {
  let index = upsertPreview(
    null,
    "android",
    "fp",
    entry("a", "2026-01-01"),
    "t1",
  );
  index = upsertPreview(index, "android", "fp", entry("b", "2026-01-02"), "t2");
  expect(index.previews.map((p) => p.id)).toEqual(["b", "a"]);
  expect(index.updatedAt).toBe("t2");
});

test("publishing the same id replaces its entry", () => {
  let index = upsertPreview(
    null,
    "android",
    "fp",
    entry("a", "2026-01-01"),
    "t1",
  );
  index = upsertPreview(
    index,
    "android",
    "fp",
    entry("a", "2026-01-03", { changelog: "- new", revision: "r2" }),
    "t2",
  );
  expect(index.previews).toHaveLength(1);
  expect(index.previews[0]).toMatchObject({
    changelog: "- new",
    revision: "r2",
  });
});

test("removing leaves the others alone", () => {
  let index = upsertPreview(null, "ios", "fp", entry("a", "2026-01-01"), "t1");
  index = upsertPreview(index, "ios", "fp", entry("b", "2026-01-02"), "t1");
  expect(removePreview(index, "a", "t2").previews.map((p) => p.id)).toEqual([
    "b",
  ]);
});

test("the top-level list mirrors each build and drops one with no previews", () => {
  const android: PlatformIndex = upsertPreview(
    null,
    "android",
    "fa",
    entry("a", "2026-01-01"),
    "t1",
  );
  const ios: PlatformIndex = upsertPreview(
    null,
    "ios",
    "fi",
    entry("a", "2026-01-01"),
    "t1",
  );
  let root = syncRootVersion(null, android, "t1");
  root = syncRootVersion(root, ios, "t2");
  expect(
    root.versions.map((v) => `${v.platform}/${v.fingerprint}/${v.count}`),
  ).toEqual(["ios/fi/1", "android/fa/1"]);
  expect(indexesListing(root, "a").sort()).toEqual([
    "index/android/fa.json",
    "index/ios/fi.json",
  ]);
  root = syncRootVersion(root, removePreview(ios, "a", "t3"), "t3");
  expect(root.versions.map((v) => v.platform)).toEqual(["android"]);
  expect(indexesListing(root, "missing")).toEqual([]);
});
