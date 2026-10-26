import { previewBundlePath, selectPreview } from "./select";

test("puts the bundle where the platform's embedded export names it", () => {
  expect(previewBundlePath("task-1")).toMatch(
    /^task-1\/(ios\/main\.jsbundle|android\/index\.android\.bundle)$/,
  );
});

test("reports false instead of throwing when the native module is not linked", () => {
  expect(selectPreview("task-1")).toBe(false);
  expect(selectPreview(null)).toBe(false);
});
