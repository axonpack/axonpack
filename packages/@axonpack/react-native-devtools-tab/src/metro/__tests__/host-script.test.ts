import { expect, test } from "bun:test";

import { withReactNativeDevtoolsPanel } from "../index";

/**
 * The host script is a string served to the DevTools page, so nothing typechecks it and nothing
 * imports it. These pull the pieces that have already broken out of that string and run them.
 */
function hostScript(): string {
  let served = "";
  const config = withReactNativeDevtoolsPanel(
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

test("puts a symbol after the tab's name, as text rather than an element", () => {
  // Every element-based icon slot in this frontend lost its drawing: the suffix slot re-renders with
  // a shallow cloneNode(), and the leading slot only takes a name from DevTools' own image set.
  expect(script).toContain("tab.icon || '\u235A'");
});
