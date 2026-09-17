import { expect, test } from "bun:test";

import { ReactNativeDevtoolsPanel } from "..";
import { DEVTOOLS_TABS } from "../core/constants/devtools.const";

/** What the DevTools frontend reads on connect, which is the only place an id is visible. */
const listed = () =>
  (globalThis as Record<string, unknown>)[DEVTOOLS_TABS] as {
    id: string;
    name: string;
  }[];

test("a tab names itself from its label, and never twice the same", () => {
  // Two tabs called the same thing is a consumer's business, not a collision. A name with nothing
  // to slug still has to produce something.
  for (const name of ["Session", "Network Requests", "Session", "Session", "⍚"])
    ReactNativeDevtoolsPanel.registerTab({ name, component: () => null });

  expect(listed().map((tab) => tab.id)).toEqual([
    "session",
    "network-requests",
    "session-2",
    "session-3",
    "tab",
  ]);
});
