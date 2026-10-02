// Semver bump badge colours. Kept with the other tokens so the changelog page and the header
// panel cannot colour the same bump differently.
export const BUMP_STYLES: Record<string, string> = {
  major: "border-transparent bg-rose-500/15 text-rose-500",
  minor: "border-transparent bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  // Fumadocs prefixes its own tokens `fd-`. Unprefixed `bg-secondary`/`text-subtle` resolved to
  // nothing, so a patch badge used to render as bare text.
  patch: "border-fd-border bg-fd-secondary text-fd-muted-foreground",
};
