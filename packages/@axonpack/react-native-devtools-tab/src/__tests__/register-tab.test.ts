import { expect, test } from "bun:test";

import { ReactNativeDevtoolsPanel } from "..";

/** No dispatcher in this process, so registering is the only thing that happens. */
function tab(name: string) {
  return ReactNativeDevtoolsPanel.registerTab({ name, component: () => null });
}

test("a tab names itself from its label, and never twice the same", () => {
  expect(tab("Session").id).toBe("session");
  expect(tab("Network Requests").id).toBe("network-requests");

  // Two tabs called the same thing is a consumer's business, not a collision.
  expect(tab("Session").id).toBe("session-2");
  expect(tab("Session").id).toBe("session-3");

  // A name with nothing to slug still has to produce something.
  expect(tab("⍚").id).toBe("tab");
});
