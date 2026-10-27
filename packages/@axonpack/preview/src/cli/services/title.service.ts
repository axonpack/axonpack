import { createInterface } from "node:readline";

/**
 * The name the app's list shows. `--title` wins; otherwise a terminal gets an editable prompt
 * prefilled with the default, and CI or an AI agent (no TTY) gets the default with no prompt.
 */
export async function askTitle(options: {
  given?: string;
  fallback: string;
  input?: NodeJS.ReadableStream & { isTTY?: boolean };
  output?: NodeJS.WritableStream & { isTTY?: boolean };
}): Promise<string> {
  const input = options.input ?? process.stdin;
  const output = options.output ?? process.stdout;
  if (options.given) return options.given;
  if (!input.isTTY || !output.isTTY) return options.fallback;
  const rl = createInterface({ input, output });
  try {
    const answer = new Promise<string>((resolve) =>
      rl.question("Name in the app: ", resolve),
    );
    // Written after the question so it lands in the line being edited, where Enter accepts it.
    rl.write(options.fallback);
    return (await answer).trim() || options.fallback;
  } finally {
    rl.close();
  }
}
