/**
 * content.json is plain strings, so a flag or an identifier in a sentence is marked with backticks
 * there and set as code here. `nowrap` keeps a flag like `--yes` from breaking at its own hyphens.
 */
export function Prose({ text }: { text: string }) {
  return text
    .split('`')
    .map((part, i) =>
      i % 2 ? (
        <code key={i} className="font-mono text-[0.875em] whitespace-nowrap">
          {part}
        </code>
      ) : (
        part
      ),
    );
}
