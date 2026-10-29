import { type PreviewInfo, previewInfo } from "../layout.util";

const info: Omit<PreviewInfo, "environment"> = {
  id: "task-1",
  title: "Task 1",
  branch: "task-1",
  commit: "abc1234",
  author: "Ana",
  publishedAt: "2026-10-01T10:00:00.000Z",
  appVersion: "1.0.0",
  buildNumber: "1",
  compatibility: "appVersion",
  fingerprint: "fp",
};

test("a preview published with --environment records it", () => {
  expect(previewInfo(info, "preview").environment).toBe("preview");
});

test("without one the entry has no environment key, like entries made before it existed", () => {
  expect(previewInfo(info)).toEqual(info);
  expect("environment" in previewInfo(info)).toBe(false);
  // An old entry read back from the bucket still types and reads as PreviewInfo.
  const old: PreviewInfo = JSON.parse(JSON.stringify(info));
  expect(old.environment).toBeUndefined();
});
