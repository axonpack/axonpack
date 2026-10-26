/** One line per commit subject, newest first, the way `git log` lists them. */
export function changelogFromSubjects(subjects: string[]): string {
  return subjects
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => `- ${s}`)
    .join("\n");
}

/** The index carries a short form, so the list stays small; the manifest keeps the whole text. */
export function shortChangelog(
  changelog: string,
  maxLines = 3,
  maxChars = 280,
): string {
  const lines = changelog.split("\n").filter((l) => l.trim());
  let short = lines.slice(0, maxLines).join("\n");
  if (short.length > maxChars)
    short = `${short.slice(0, maxChars - 1).trimEnd()}…`;
  else if (lines.length > maxLines)
    short += `\n… ${lines.length - maxLines} more`;
  return short;
}
