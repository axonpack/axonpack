import { DEFAULT_LABELS } from "../../../constants/preview-list/theme.const";
import { timeAgo } from "../time-ago.util";

const NOW = Date.parse("2026-10-29T12:00:00.000Z");
const ago = (ms: number) =>
  timeAgo(new Date(NOW - ms).toISOString(), NOW, DEFAULT_LABELS.timeAgo);
const MINUTE = 60_000;

test.each([
  [0, "Just now"],
  [59_000, "Just now"],
  [-5 * MINUTE, "Just now"],
  [MINUTE, "1 minute ago"],
  [2 * MINUTE, "2 minutes ago"],
  [59 * MINUTE, "59 minutes ago"],
  [60 * MINUTE, "1 hour ago"],
  [5 * 60 * MINUTE, "5 hours ago"],
  [24 * 60 * MINUTE, "1 day ago"],
  [29 * 24 * 60 * MINUTE, "29 days ago"],
])("%d ms ago reads as %s", (ms, text) => {
  expect(ago(ms)).toBe(text);
});

test("past 30 days it is the date", () => {
  const then = new Date(NOW - 45 * 24 * 60 * MINUTE);
  expect(ago(45 * 24 * 60 * MINUTE)).toBe(then.toLocaleDateString());
});

test("a date it cannot read gives nothing", () => {
  expect(timeAgo("", NOW, DEFAULT_LABELS.timeAgo)).toBe("");
});

test("the words come from the labels", () => {
  expect(
    timeAgo(new Date(NOW - 3 * MINUTE).toISOString(), NOW, {
      ...DEFAULT_LABELS.timeAgo,
      minutes: "hace {n} minutos",
    }),
  ).toBe("hace 3 minutos");
});
