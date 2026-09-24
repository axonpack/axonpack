import { expect, test } from "bun:test";

import { ReactNativeDevtoolsPanel } from "..";
import {
  DEVTOOLS_FOCUS,
  DEVTOOLS_TABS,
} from "../core/constants/devtools.const";

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

test("focus leaves the tab's id for the next DevTools window to open on", () => {
  // The only thing a window that does not exist yet can read, so the id has to be the tab's own.
  const tab = ReactNativeDevtoolsPanel.registerTab({
    name: "Focus Me",
    component: () => null,
  });
  tab.focus();

  expect((globalThis as Record<string, unknown>)[DEVTOOLS_FOCUS]).toBe(
    "focus-me",
  );
});
