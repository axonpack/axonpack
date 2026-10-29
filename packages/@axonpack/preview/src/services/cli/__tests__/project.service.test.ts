import { execFileSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { gitInfo } from "../project.service";

const repo = () => {
  const dir = mkdtempSync(join(tmpdir(), "preview-git-"));
  const git = (...args: string[]) =>
    execFileSync(
      "git",
      ["-c", "user.name=t", "-c", "user.email=t@t", ...args],
      {
        cwd: dir,
        stdio: "ignore",
      },
    );
  git("init", "-q", "-b", "task-1-login-fix");
  git("commit", "-q", "--allow-empty", "-m", "first");
  return { dir, detach: () => git("checkout", "-q", "--detach") };
};

test("on a branch, the branch, whatever CI sets", () => {
  const { dir } = repo();
  expect(
    gitInfo(dir, { id: "other", env: { GITHUB_HEAD_REF: "ci-branch" } }).branch,
  ).toBe("task-1-login-fix");
});

describe("on a detached HEAD, as a CI checkout of a pull request", () => {
  test("GITHUB_HEAD_REF names the branch", () => {
    const { dir, detach } = repo();
    detach();
    expect(
      gitInfo(dir, { id: "my-id", env: { GITHUB_HEAD_REF: "ci-branch" } })
        .branch,
    ).toBe("ci-branch");
  });

  test("without it, the preview id stands in", () => {
    const { dir, detach } = repo();
    detach();
    expect(gitInfo(dir, { id: "my-id", env: {} }).branch).toBe("my-id");
  });

  test("without either, no branch, so publish still asks for --id", () => {
    const { dir, detach } = repo();
    detach();
    expect(gitInfo(dir, { env: {} }).branch).toBe("");
  });
});
