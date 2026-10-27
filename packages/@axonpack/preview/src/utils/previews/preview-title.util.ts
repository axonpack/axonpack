// The preview id is the branch name, so this is what QA reads when no `--title` was given.
export function previewTitle(branch: string): string {
  const words = branch.replace(/[-_/]+/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}
