import { PassThrough } from "node:stream";

import { previewTitle } from "../../../utils/previews/preview-title.util";
import { registration } from "../../start/start.service";
import { askTitle } from "../title.service";

const stream = (isTTY: boolean) => Object.assign(new PassThrough(), { isTTY });

test("--title is used as it is, with no prompt", async () => {
  const output = stream(true);
  const written: string[] = [];
  output.on("data", (chunk) => written.push(String(chunk)));
  await expect(
    askTitle({
      given: "Login fix",
      fallback: "Task 1",
      input: stream(true),
      output,
    }),
  ).resolves.toBe("Login fix");
  expect(written).toEqual([]);
});

test("with no terminal it takes the default and asks nothing", async () => {
  await expect(
    askTitle({ fallback: "Task 1 login fix", input: stream(false) }),
  ).resolves.toBe("Task 1 login fix");
});

test("the default is the branch's readable title", () => {
  expect(previewTitle("task-1-login-fix")).toBe("Task 1 login fix");
});

test("start announces the chosen name, or the branch title without one", () => {
  const base = {
    config: { slug: "shop", name: "Shop" },
    port: 8082,
    branch: "task-1-login-fix",
    worktree: "/w",
  };
  expect(registration({ ...base, title: "Checkout" }).title).toBe("Checkout");
  expect(registration(base).title).toBe("Task 1 login fix");
});
