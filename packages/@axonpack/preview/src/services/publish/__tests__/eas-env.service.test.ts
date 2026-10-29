import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { ENV, readConfig } from "../../cli/config.service";
import { buildBundle } from "../bundle.service";
import { applyEasEnv, pullEasEnv } from "../eas-env.service";

jest.mock("node:child_process", () => ({ execFileSync: jest.fn() }));
jest.mock("../../cli/project.service", () => ({
  appRequire: () =>
    jest
      .requireActual<typeof import("node:module")>("node:module")
      .createRequire(require.resolve("expo/package.json")),
}));
const run = execFileSync as unknown as jest.Mock;

const pulledFile = () => {
  const args: string[] = run.mock.calls[0][1];
  return args[args.indexOf("--path") + 1];
};

// What eas-cli 20 writes: plain and sensitive values, and secrets as comments.
const pulled = `# Environment: preview

API_URL=https://preview.example.com
SHARED=from-eas
# SECRET_KEY=***** (secret)`;

const pullWrites = (content: string) =>
  run.mockImplementationOnce((_cmd, args: string[]) => {
    writeFileSync(args[args.indexOf("--path") + 1], content);
    return "";
  });

const failsWith = (error: object) =>
  run.mockImplementationOnce(() => {
    throw Object.assign(new Error("Command failed: eas env:pull"), error);
  });

beforeEach(() => run.mockReset());

test("pulls with eas env:pull into a temp file outside the project, and deletes it", () => {
  pullWrites(pulled);
  expect(pullEasEnv("/app", "preview")).toEqual({
    API_URL: "https://preview.example.com",
    SHARED: "from-eas",
  });
  expect(run).toHaveBeenCalledWith(
    "eas",
    expect.arrayContaining([
      "env:pull",
      "--environment",
      "preview",
      "--non-interactive",
    ]),
    expect.objectContaining({ cwd: "/app" }),
  );
  expect(pulledFile().startsWith("/app")).toBe(false);
  expect(existsSync(dirname(pulledFile()))).toBe(false);
});

test("the temp file is deleted when eas fails too", () => {
  run.mockImplementationOnce((_cmd, args: string[]) => {
    writeFileSync(args[args.indexOf("--path") + 1], pulled);
    throw new Error("boom");
  });
  expect(() => pullEasEnv("/app", "preview")).toThrow("boom");
  expect(existsSync(dirname(pulledFile()))).toBe(false);
});

test("the values reach the export's environment, and the shell's own values win", () => {
  const env = process.env;
  process.env = { ...env, SHARED: "from-shell" };
  try {
    pullWrites(pulled);
    applyEasEnv("/app", "preview");
    let exportEnv: Record<string, string | undefined> = {};
    run.mockImplementationOnce((_cmd, args: string[]) => {
      exportEnv = { ...process.env };
      writeFileSync(
        args[args.indexOf("--bundle-output") + 1],
        Buffer.alloc(16),
      );
      return "";
    });
    buildBundle("/app", "android");
    expect(run.mock.calls[1][0]).toBe("npx");
    expect(exportEnv.API_URL).toBe("https://preview.example.com");
    expect(exportEnv.SHARED).toBe("from-shell");
    expect(exportEnv.SECRET_KEY).toBeUndefined();
  } finally {
    process.env = env;
  }
});

describe("says what to do when eas", () => {
  test("is not installed", () => {
    failsWith({ code: "ENOENT" });
    expect(() => pullEasEnv("/app", "preview")).toThrow(
      "npm install -g eas-cli",
    );
  });

  test("is not logged in", () => {
    failsWith({
      status: 1,
      stdout:
        "An Expo user account is required to proceed.\nEither log in with eas login or set the EXPO_TOKEN environment variable",
      stderr: "    Error: env:pull command failed.\n",
    });
    expect(() => pullEasEnv("/app", "preview")).toThrow("run eas login");
  });

  test("has no project linked", () => {
    failsWith({
      status: 1,
      stdout:
        "EAS project not configured.\nMust configure EAS project by running 'eas init' before this command can be run in non-interactive mode.\n",
      stderr: "    Error: env:pull command failed.\n",
    });
    expect(() => pullEasEnv("/app", "preview")).toThrow(
      "linked to EAS: run eas init",
    );
  });

  test("fails another way: its own output is passed on", () => {
    failsWith({ status: 1, stdout: "", stderr: "Environment not found\n" });
    expect(() => pullEasEnv("/app", "staging")).toThrow(
      "eas env:pull --environment staging failed:\nEnvironment not found",
    );
  });
});

test("without --environment the build never calls eas", () => {
  run.mockImplementationOnce((_cmd, args: string[]) => {
    writeFileSync(args[args.indexOf("--bundle-output") + 1], Buffer.alloc(16));
    return "";
  });
  buildBundle("/app", "ios");
  expect(run.mock.calls.map(([cmd]) => cmd)).toEqual(["npx"]);
});

test("publish settings: the shell wins over EAS, and EAS over Expo's env files", () => {
  const project = mkdtempSync(join(tmpdir(), "preview-precedence-"));
  writeFileSync(
    join(project, ".env.local"),
    `${ENV.url}=http://file/from-file\n${ENV.accessKeyId}=file-id\n${ENV.secretAccessKey}=file-secret\n${ENV.region}=file-region\n`,
  );
  pullWrites(
    `${ENV.url}=http://eas/from-eas\n${ENV.accessKeyId}=eas-id\n${ENV.secretAccessKey}=eas-secret\n`,
  );
  const env: Record<string, string | undefined> = {
    [ENV.secretAccessKey]: "shell-secret",
  };
  applyEasEnv(project, "preview", env);
  expect(readConfig(project, env)).toMatchObject({
    bucket: "from-eas",
    region: "file-region",
    credentials: { accessKeyId: "eas-id", secretAccessKey: "shell-secret" },
  });
});
