import { changelogFromSubjects, shortChangelog } from "./changelog";

test("turns commit subjects into a list and skips blanks", () => {
  expect(changelogFromSubjects(["Fix login", " ", "Add retry "])).toBe(
    "- Fix login\n- Add retry",
  );
});

test("keeps short changelogs whole", () => {
  expect(shortChangelog("- a\n- b")).toBe("- a\n- b");
});

test("cuts long changelogs to a few lines and says how many are left", () => {
  expect(shortChangelog("- a\n- b\n- c\n- d\n- e")).toBe(
    "- a\n- b\n- c\n… 2 more",
  );
});

test("cuts one very long line by characters", () => {
  const short = shortChangelog("x".repeat(400));
  expect(short.length).toBe(280);
  expect(short.endsWith("…")).toBe(true);
});
