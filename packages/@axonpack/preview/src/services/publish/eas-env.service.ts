import { execFileSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { parseEnv } from "node:util";

/**
 * An EAS environment's variables, as `eas env:pull` gives them. Pulled into a temp folder outside
 * the project and deleted after. Secret-visibility variables never leave EAS servers: `env:pull`
 * writes them as comments, so they are missing here.
 *
 * A file-type variable's value is a path. `env:pull` writes those files into the project's
 * `.eas/.env/` whatever `--path` says, so each is copied into `filesDir`, the value points there,
 * and whatever the pull added to the project is deleted. A file that was already there stays.
 */
export function pullEasEnv(
  projectRoot: string,
  environment: string,
  filesDir: string,
): Record<string, string> {
  const dir = mkdtempSync(join(tmpdir(), "preview-eas-env-"));
  const file = join(dir, ".env");
  const eas = join(projectRoot, ".eas");
  const envDir = join(eas, ".env");
  const had = {
    eas: existsSync(eas),
    envDir: existsSync(envDir),
    files: new Set(existsSync(envDir) ? readdirSync(envDir) : []),
  };
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
    const values = parseEnv(readFileSync(file, "utf8")) as Record<
      string,
      string
    >;
    const pulled = existsSync(envDir) ? realpathSync(envDir) : null;
    for (const [name, value] of Object.entries(values)) {
      const path = resolve(projectRoot, value);
      if (
        !pulled ||
        !existsSync(path) ||
        realpathSync(dirname(path)) !== pulled
      )
        continue;
      mkdirSync(filesDir, { recursive: true });
      values[name] = join(filesDir, basename(path));
      copyFileSync(path, values[name]);
    }
    return values;
  } catch (error) {
    throw easError(error, environment);
  } finally {
    rmSync(dir, { recursive: true, force: true });
    if (!had.eas) rmSync(eas, { recursive: true, force: true });
    else if (!had.envDir) rmSync(envDir, { recursive: true, force: true });
    else if (existsSync(envDir))
      for (const name of readdirSync(envDir))
        if (!had.files.has(name)) rmSync(join(envDir, name), { force: true });
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

/**
 * Adds the EAS values to `env`; a variable already set there (the shell's) wins. File-type values
 * point into `filesDir`.
 */
export function applyEasEnv(
  projectRoot: string,
  environment: string,
  filesDir: string,
  env: Record<string, string | undefined> = process.env,
) {
  for (const [name, value] of Object.entries(
    pullEasEnv(projectRoot, environment, filesDir),
  ))
    if (env[name] === undefined) env[name] = value;
}
