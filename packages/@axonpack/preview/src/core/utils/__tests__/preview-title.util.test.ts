import { previewTitle } from "../preview-title.util";

test("turns a branch name into a title", () => {
  expect(previewTitle("task-1-login-fix")).toBe("Task 1 login fix");
});

test("treats slash and underscore as spaces, and squeezes runs of them", () => {
  expect(previewTitle("feature/new_checkout--flow")).toBe(
    "Feature new checkout flow",
  );
});

test("leaves the rest of the case alone", () => {
  expect(previewTitle("fix-iOS-crash")).toBe("Fix iOS crash");
});

test("drops leading and trailing separators", () => {
  expect(previewTitle("/-hotfix-")).toBe("Hotfix");
});
