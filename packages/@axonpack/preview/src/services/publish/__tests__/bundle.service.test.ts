import { execFileSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { buildBundle } from "../bundle.service";

jest.mock("node:child_process", () => ({ execFileSync: jest.fn() }));
const run = execFileSync as unknown as jest.Mock;

const app = realpathSync(mkdtempSync(join(tmpdir(), "preview-bundle-")));
afterAll(() => rmSync(app, { recursive: true, force: true }));
// The app's own expo, the one its install put in its node_modules.
const expo = join(app, "node_modules/expo");
mkdirSync(join(expo, "bin"), { recursive: true });
writeFileSync(join(app, "package.json"), "{}");
writeFileSync(join(expo, "package.json"), '{ "name": "expo" }');
writeFileSync(join(expo, "bin/cli"), "");

test("runs the app's own Expo CLI with Node, no package manager, in the app's folder with the env it is given", () => {
  const out = join(app, "out");
  // The copy's env, with an EAS value.
  const env = {
    ...process.env,
    PREVIEW_PUBLISH: "1",
    EAS_BUILD: "1",
    API_URL: "from-eas",
  };
  run.mockImplementationOnce((_cmd, args: string[]) => {
    // Hermes bytecode's magic number, then version 96.
    writeFileSync(
      args[args.indexOf("--bundle-output") + 1],
      Buffer.from([
        0xc6, 0x1f, 0xbc, 0x03, 0xc1, 0x03, 0x19, 0x1f, 96, 0, 0, 0,
      ]),
    );
    return "";
  });

  const result = buildBundle(app, "android", {
    entryFile: join(app, "src/main.tsx"),
    outDir: out,
    env,
  });

  expect(run.mock.calls).toEqual([
    [
      process.execPath,
      [
        join(expo, "bin/cli"),
        "export:embed",
        "--platform",
        "android",
        "--dev",
        "false",
        "--bytecode",
        "--bundle-output",
        join(out, "index.android.bundle"),
        "--assets-dest",
        out,
        "--entry-file",
        join(app, "src/main.tsx"),
      ],
      { cwd: app, stdio: "inherit", env },
    ],
  ]);
  expect(result.hermesVersion).toBe(96);
  expect(result.files.map((f) => f.path)).toEqual(["index.android.bundle"]);
});
