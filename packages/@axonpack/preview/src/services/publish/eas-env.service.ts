import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseEnv } from "node:util";

/**
 * An EAS environment's variables, as `eas env:pull` gives them. Pulled into a temp folder outside
 * the project and deleted after. Secret-visibility variables never leave EAS servers: `env:pull`
 * writes them as comments, so they are missing here.
 */
export function pullEasEnv(
  projectRoot: string,
  environment: string,
): Record<string, string> {
  const dir = mkdtempSync(join(tmpdir(), "preview-eas-env-"));
  const file = join(dir, ".env");
  try {
    execFileSync(
      "eas",
      [
        "env:pull",
        "--environment",
        environment,
        "--non-interactive",
        "--path",
        file,
      ],
      { cwd: projectRoot, encoding: "utf8", stdio: "pipe" },
    );
    return parseEnv(readFileSync(file, "utf8")) as Record<string, string>;
  } catch (error) {
    throw easError(error, environment);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function easError(error: unknown, environment: string): Error {
  const e = error as { code?: string; stdout?: string; stderr?: string };
  if (e.code === "ENOENT")
    return new Error(
      "--environment needs eas-cli: npm install -g eas-cli, then eas login.",
    );
  const output = `${e.stdout ?? ""}${e.stderr ?? ""}`;
  if (output.includes("An Expo user account is required"))
    return new Error(
      "--environment needs an Expo login: run eas login, or set EXPO_TOKEN in CI.",
    );
  if (output.includes("eas init"))
    return new Error(
      "--environment needs the project linked to EAS: run eas init in the app's root.",
    );
  return new Error(
    `eas env:pull --environment ${environment} failed:\n${output.trim() || String(error)}`,
  );
}

/** Adds the EAS values to `env`; a variable already set there (the shell's) wins. */
export function applyEasEnv(
  projectRoot: string,
  environment: string,
  env: Record<string, string | undefined> = process.env,
) {
  for (const [name, value] of Object.entries(
    pullEasEnv(projectRoot, environment),
  ))
    if (env[name] === undefined) env[name] = value;
}
