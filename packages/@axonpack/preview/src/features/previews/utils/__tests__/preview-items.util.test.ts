import type { IndexEntry } from "../../../../core/utils/layout.util";
import type { LocalPreview } from "../../services/local-previews.service";
import { previewItems } from "../preview-items.util";
import type { PreviewsState } from "../../stores/previews.store";

const entry = (id: string, revision = "r1"): IndexEntry => ({
  id,
  title: id,
  branch: id,
  commit: "c",
  author: "a",
  publishedAt: "2026-01-01",
  appVersion: "1",
  buildNumber: "1",
  compatibility: "appVersion",
  fingerprint: "f",
  revision,
  size: 1,
  changelog: "",
  manifest: `previews/ios/fp/${id}.json`,
});

const local = (id: string, key = "fp", revision = "r1"): LocalPreview => ({
  id,
  platform: "ios",
  key,
  revision,
  downloadedAt: "2026-01-02",
  entry: entry(id, revision),
});

const state = (patch: Partial<PreviewsState>): PreviewsState => ({
  loading: false,
  error: null,
  buildKey: "fp",
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

test.each([
  ["appVersion", "version-1.0.1", "version-1.0.0"],
  ["fingerprint", "fingerprint-new", "fingerprint-old"],
])(
  "in %s mode, downloads for another build key are incompatible",
  (_mode, current, old) => {
    const { items, incompatible } = previewItems(
      state({
        buildKey: current,
        remote: [],
        local: [local("now", current), local("before", old)],
      }),
    );
    expect(items.map((i) => i.id)).toEqual(["now"]);
    expect(incompatible.map((p) => p.id)).toEqual(["before"]);
  },
);
