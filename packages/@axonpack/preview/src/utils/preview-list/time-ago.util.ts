import type { PreviewListLabels } from "../../components/preview-list/preview-list.types";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * "2 minutes ago", from the labels, up to 30 days back; anything older is the date. Built here
 * because Hermes has no `Intl.RelativeTimeFormat`, and so every word can be a label.
 */
export function timeAgo(
  iso: string,
  now: number,
  labels: PreviewListLabels["timeAgo"],
): string {
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return "";
  const ago = now - then;
  const count = (unit: number, one: string, many: string) => {
    const n = Math.floor(ago / unit);
    return n === 1 ? one : many.replace("{n}", String(n));
  };
  // A clock a little behind the publisher's gives a date in the future: that is just now too.
  if (ago < MINUTE) return labels.now;
  if (ago < HOUR) return count(MINUTE, labels.minute, labels.minutes);
  if (ago < DAY) return count(HOUR, labels.hour, labels.hours);
  if (ago < 30 * DAY) return count(DAY, labels.day, labels.days);
  return new Date(then).toLocaleDateString();
}
