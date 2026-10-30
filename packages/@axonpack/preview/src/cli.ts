#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseArgs } from "node:util";

import { PLATFORMS, Platform } from "./utils/previews/layout.util";
import { prune, publish, unpublish } from "./services/publish/commands.service";
import { applyEasEnv } from "./services/publish/eas-env.service";
import {
  DEFAULT_PORT_RANGE,
  DEFAULT_REGISTRY_PORT,
} from "./constants/dev-preview-servers/dev-preview-servers.const";
import { readConfig } from "./services/cli/config.service";
import { createRegistry } from "./services/registry/registry.service";
import { advertise, thisMachine } from "./services/registry/bonjour.service";
import { start } from "./services/start/start.service";
import { askTitle } from "./services/cli/title.service";
import { previewTitle } from "./utils/previews/preview-title.util";
import {
  compatibilityOf,
  resolveCompatibility,
} from "./utils/config/expo-config.util";
import {
  appConfig,
  changelogSince,
  defaultBase,
  gitInfo,
  gitTopLevel,
} from "./services/cli/project.service";

const HELP = `preview <command> [options]

  publish            build this app's JS bundle and upload it as a preview
    --id <id>          preview id (default: the git branch)
    --title <title>    name QA sees; without it a terminal asks, prefilled with a readable
                       form of the id (Enter keeps it). No prompt without a terminal (CI)
    --platform <p>     android, ios or all (default: all)
    --base <branch>    branch the changelog counts from (default: the repo's default branch)
    --changelog=<text> changelog text instead of the commit subjects (use = when it starts
                       with a dash, as a "- item" list does)
    --changelog-file <path>
    --entry-file <path>
    --compatibility <c> appVersion or fingerprint; overrides the app config's plugin option
    --environment <name> build with this EAS environment's variables, like eas update
                       (needs eas-cli and a project linked to EAS; shell variables win).
                       The app shows its name on the preview.
  unpublish <id>     remove a preview from every build's list
  prune              delete files no preview uses any more
  start [-- <expo start args>]
                     run Metro on a free port and announce it to the app's Dev preview servers,
                     on this computer and to phones on the same network (Bonjour)
    --title <title>    name the app's list shows; asked like publish, prefilled with a
                       readable form of the branch
    --ports <from>-<to> ports to pick from (default 8081-8099)

  --project <dir>    the app's root (default: the current folder)

Where to publish comes from the environment (the shell, or CI secrets). For local use they can
also go in the app's .env.local, or any env file Expo loads for a release build; the environment
wins over them. Keep the write key out of a committed .env:
  PREVIEW_S3_URL                 <endpoint>/<bucket>[/<folder>], e.g. http://localhost:9000/previews-public
  PREVIEW_S3_ACCESS_KEY_ID       the write key
  PREVIEW_S3_SECRET_ACCESS_KEY
  PREVIEW_S3_REGION              optional, default us-east-1`;

async function main() {
  // Everything after `--` goes to `expo start` untouched.
  const argv = process.argv.slice(2);
  const dash = argv.indexOf("--");
  const passThrough = dash >= 0 ? argv.slice(dash + 1) : [];
  const { values, positionals } = parseArgs({
    args: dash >= 0 ? argv.slice(0, dash) : argv,
    allowPositionals: true,
    options: {
      id: { type: "string" },
      title: { type: "string" },
      platform: { type: "string", default: "all" },
      base: { type: "string" },
      changelog: { type: "string" },
      "changelog-file": { type: "string" },
      "entry-file": { type: "string" },
      compatibility: { type: "string" },
      environment: { type: "string" },
      project: { type: "string" },
      port: { type: "string" },
      ports: { type: "string" },
      help: { type: "boolean", short: "h" },
    },
  });
  const [command, arg] = positionals;
  if (values.help || !command) {
    process.stdout.write(`${HELP}\n`);
    return;
  }
  const projectRoot = resolve(values.project ?? process.cwd());
  // Only the bucket commands need the publish settings.
  const s3 = () => readConfig(projectRoot);

  if (command === "publish") {
    // Before anything reads the app config: the config, fingerprint and export must all see the
    // same variables a build in that environment saw, or the key would not match.
    if (values.environment) applyEasEnv(projectRoot, values.environment);
    const git = gitInfo(projectRoot, { id: values.id });
    const id = values.id ?? git.branch;
    if (!id)
      throw new Error("No git branch to name the preview after; pass --id.");
    const platforms =
      values.platform === "all" ? PLATFORMS : [values.platform as Platform];
    if (!platforms.every((p) => PLATFORMS.includes(p))) {
      throw new Error(`--platform must be android, ios or all`);
    }
    const changelog =
      values.changelog ??
      (values["changelog-file"]
        ? readFileSync(resolve(values["changelog-file"]), "utf8").trim()
        : changelogSince(projectRoot, values.base ?? defaultBase(projectRoot)));
    const config = appConfig(projectRoot);
    const { compatibility, warnings } = resolveCompatibility(
      compatibilityOf(config),
      values.compatibility,
    );
    for (const warning of warnings)
      process.stderr.write(`warning: ${warning}\n`);
    await publish({
      projectRoot,
      config,
      compatibility,
      s3: s3(),
      platforms,
      id,
      title: await askTitle({
        given: values.title,
        fallback: previewTitle(id),
      }),
      ...git,
      changelog,
      entryFile: values["entry-file"],
      environment: values.environment,
    });
  } else if (command === "unpublish") {
    if (!arg) throw new Error("Which preview? preview unpublish <id>");
    await unpublish(s3(), arg);
  } else if (command === "prune") {
    await prune(s3());
  } else if (command === "start") {
    const [from, to] = (
      values.ports ?? `${DEFAULT_PORT_RANGE[0]}-${DEFAULT_PORT_RANGE[1]}`
    )
      .split("-")
      .map(Number);
    if (!from || !to || from > to)
      throw new Error("--ports must look like 8081-8099");
    const config = appConfig(projectRoot);
    const branch = gitInfo(projectRoot).branch;
    const title = await askTitle({
      given: values.title,
      // Empty lets the announcement fall back to the app's name.
      fallback: branch ? previewTitle(branch) : "",
    });
    await start({
      projectRoot,
      config,
      branch,
      title,
      worktree: gitTopLevel(projectRoot) ?? projectRoot,
      ports: [from, to],
      registryPort: DEFAULT_REGISTRY_PORT,
      expoArgs: passThrough,
      bin: process.argv[1],
    });
  } else if (command === "registry") {
    // Started by `preview start` when none is running; exits once no server is left. It also
    // announces the servers over Bonjour, so phones on the network find them with no address typed.
    const port = Number(values.port ?? DEFAULT_REGISTRY_PORT);
    const machine = thisMachine();
    const bonjour = advertise(machine, port);
    const { server } = createRegistry({
      machine,
      onChange: bonjour.sync,
      onIdle: () => process.exit(0),
    });
    server.listen(port);
  } else {
    throw new Error(`Unknown command ${command}.\n\n${HELP}`);
  }
}

main().catch((error: unknown) => {
  process.stderr.write(
    `preview: ${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exit(1);
});
