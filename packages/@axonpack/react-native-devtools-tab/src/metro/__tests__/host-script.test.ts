import { expect, test } from "bun:test";

import { withReactNativeDevtoolsTab } from "../index";

/**
 * The host script is a string served to the DevTools page, so nothing typechecks it and nothing
 * imports it. These pull the pieces that have already broken out of that string and run them.
 */
function hostScript(): string {
  let served = "";
  const config = withReactNativeDevtoolsTab(
    { server: {} },
    { frontendPath: "/tmp/none" },
  ) as { server: { enhanceMiddleware: (m: unknown, s: unknown) => Handler } };

  type Handler = (req: unknown, res: unknown, next: () => void) => void;
  const handler = config.server.enhanceMiddleware(() => undefined, null);

  handler(
    { url: "/devtools-tab/host.js", method: "GET", on: () => undefined },
    {
      setHeader: () => undefined,
      end: (body: string) => {
        served = body;
      },
    },
    () => undefined,
  );

  return served;
}

const script = hostScript();

test("is a valid template with nothing left uninterpolated", () => {
  // Backticks or a `${` written into the script would have closed the template literal it lives in,
  // which is a build error; a stray one that survives is a placeholder that never got filled.
  expect(script).not.toContain("${");
  expect(script.length).toBeGreaterThan(1000);
});

/** The right-hand side of the one line that decides what a tab shows. */
function iframeSrc(tab: Record<string, string>): string {
  const expression = script.match(/iframe\.src =\s*([\s\S]*?);\n/)?.[1];
  if (!expression) throw new Error("the iframe src line has moved");
  return new Function("tab", `return ${expression}`)(tab) as string;
}

test("a tab's iframe loads this package's page, named by the tab", () => {
  // Encoded rather than interpolated, because an id is whatever the app called it.
  expect(iframeSrc({ id: "a b" })).toBe(
    "/devtools-tab/panel/index.html?tab=a%20b",
  );
});
