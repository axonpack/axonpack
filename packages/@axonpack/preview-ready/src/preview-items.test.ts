import type { IndexEntry } from "./core/layout";
import type { LocalPreview } from "./local";
import { previewItems } from "./preview-items";
import type { PreviewsState } from "./previews.store";

const entry = (id: string, revision = "r1"): IndexEntry => ({
  id,
  title: id,
  branch: id,
  commit: "c",
  author: "a",
  publishedAt: "2026-01-01",
  appVersion: "1",
  buildNumber: "1",
  revision,
  size: 1,
  changelog: "",
  manifest: `previews/ios/fp/${id}.json`,
});

const local = (
  id: string,
  fingerprint = "fp",
  revision = "r1",
): LocalPreview => ({
  id,
  platform: "ios",
  fingerprint,
  revision,
  downloadedAt: "2026-01-02",
  entry: entry(id, revision),
});

const state = (patch: Partial<PreviewsState>): PreviewsState => ({
  loading: false,
  error: null,
  fingerprint: "fp",
  remote: [],
  local: [],
  downloading: {},
  activeId: null,
  broken: [],
  ...patch,
});

const statuses = (s: PreviewsState) =>
  Object.fromEntries(previewItems(s).items.map((i) => [i.id, i.status]));

test("gives each preview its state", () => {
  expect(
    statuses(
      state({
        remote: [
          entry("new"),
          entry("same"),
          entry("newer", "r2"),
          entry("busy"),
        ],
        local: [local("same"), local("newer"), local("gone")],
        downloading: { busy: 0.5 },
      }),
    ),
  ).toEqual({
    new: "available",
    same: "downloaded",
    newer: "update-available",
    busy: "downloading",
    gone: "unpublished",
  });
});

test("does not call a download unpublished before the bucket has answered", () => {
  expect(statuses(state({ remote: null, local: [local("a")] }))).toEqual({
    a: "downloaded",
  });
});

test("puts downloads for another build apart, and marks the active one", () => {
  const { items, incompatible } = previewItems(
    state({
      remote: [entry("a")],
      local: [local("a"), local("old", "other")],
      activeId: "a",
    }),
  );
  expect(items.map((i) => [i.id, i.active])).toEqual([["a", true]]);
  expect(incompatible.map((p) => p.id)).toEqual(["old"]);
});

test("a preview that stopped before starting shows as broken", () => {
  expect(
    statuses(
      state({ remote: [entry("a")], local: [local("a")], broken: ["a"] }),
    ),
  ).toEqual({
    a: "broken",
  });
});
