import { NativeModules } from "react-native";
import {
  ReactNativeDevtoolsPanel,
  ref,
} from "@axonpack/react-native-devtools-tab";

import PanelUI from "./PanelUI";

/**
 * A tab per thing worth checking. Each layout crosses the wire once, at registration; after that
 * only the slices below do.
 */

export const gallery = ReactNativeDevtoolsPanel.registerTab({
  id: "gallery",
  name: "Gallery",
  state: {
    tick: "0",
    rows: [
      ["one", "1", "first"],
      // Deliberately ragged: a short row should leave a blank cell rather than shift the grid.
      ["two", "2"],
      ["three", "3", "third", "ignored"],
    ] as string[][],
    payload: { nested: { works: true }, list: [1, 2, 3] } as unknown,
  },
  layout: {
    kind: "stack",
    children: [
      { kind: "heading", value: "Every node kind" },
      { kind: "text", value: "A constant, never re-sent." },
      { kind: "text", value: "Muted.", tone: "muted" },
      { kind: "field", label: "tick", value: ref("tick") },
      {
        kind: "row",
        children: [
          { kind: "badge", value: "default" },
          { kind: "badge", value: "success", tone: "success" },
          { kind: "badge", value: "warning", tone: "warning" },
          { kind: "badge", value: "error", tone: "error" },
        ],
      },
      { kind: "divider" },
      { kind: "table", columns: ["key", "value", "note"], rows: ref("rows") },
      { kind: "json", value: ref("payload") },
      { kind: "input", action: "typed", placeholder: "sends each keystroke" },
      {
        kind: "row",
        children: [
          { kind: "button", label: "Plain", action: "plain" },
          {
            kind: "button",
            label: "Destructive",
            action: "destructive",
            tone: "error",
          },
        ],
      },
    ],
  },
});

export const counter = ReactNativeDevtoolsPanel.registerTab({
  id: "counter",
  name: "Counter",
  icon: "◴",
  state: { tick: "0", busy: false },
  layout: {
    kind: "stack",
    children: [
      { kind: "heading", value: "Counter" },
      { kind: "field", label: "tick", value: ref("tick") },
      {
        kind: "when",
        value: ref("busy"),
        show: { kind: "badge", value: "busy", tone: "warning" },
        otherwise: { kind: "badge", value: "idle", tone: "success" },
      },
      { kind: "button", label: "Toggle busy", action: "toggle" },
    ],
  },
});

/**
 * Reads no slice the others write, so it never redraws. Useful for watching in DevTools while the
 * counter ticks: if this one flickers, the slice filtering is broken.
 */
export const escaping = ReactNativeDevtoolsPanel.registerTab({
  id: "escaping",
  name: "Escaping",
  icon: "⚑",
  state: { hostile: '<img src=x onerror="alert(1)">' },
  layout: {
    kind: "stack",
    children: [
      { kind: "heading", value: "Text is text" },
      { kind: "text", value: ref("hostile") },
      { kind: "json", value: ref("hostile") },
    ],
  },
});

/** The other direction: the panel, or anything else, can call these and wait for an answer. */
ReactNativeDevtoolsPanel.expose({
  ping: () => "pong",
  echo: (value: unknown) => value,
  slow: async () => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return "took half a second";
  },
  boom: () => {
    throw new Error("this is what a failing handler looks like");
  },
});

let tick = 0;

// Only `tick` goes over the wire each second. The Escaping tab reads no slice that changes, so it is
// registered once and then never touched again.
setInterval(() => {
  tick += 1;
  gallery.setState({ tick: String(tick) });
  counter.setState({ tick: String(tick) });
  // The React tab reads no slice, so it is sent a plain message and decides for itself.
  ReactNativeDevtoolsPanel.send("clock", tick);
}, 1000);

export function toggleBusy(): void {
  counter.setState({ busy: !counter.getState().busy });
}

/**
 * Experiment: a tab that runs shell commands on the dev machine.
 *
 * Nothing but the tab vocabulary is used here, so there is no page to write. What there is no way
 * around is the Metro half: a browser panel cannot spawn a process and neither can Hermes, so the
 * button press comes back here and this fetches the dev server, which is Node and can.
 */
export const shell = ReactNativeDevtoolsPanel.registerTab({
  id: "shell",
  name: "Shell",
  icon: "\u2325",
  state: {
    cmd: "uname -a && pwd && whoami",
    status: "idle",
    exit: "-",
    lines: [] as string[][],
  },
  layout: {
    kind: "stack",
    children: [
      { kind: "heading", value: "Run a command where Metro is" },
      { kind: "input", action: "typed", value: ref("cmd") },
      {
        kind: "row",
        children: [
          { kind: "button", label: "Run", action: "run" },
          { kind: "field", label: "status", value: ref("status") },
          { kind: "field", label: "exit", value: ref("exit") },
        ],
      },
      { kind: "divider" },
      { kind: "table", columns: ["output"], rows: ref("lines") },
    ],
  },
});

/**
 * Only the app knows how to reach the dev server: it is `localhost` on a simulator, a LAN address on
 * a real device, and the bundle it was loaded from is the one thing that always names it correctly.
 */
const devServer = String(NativeModules.SourceCode?.scriptURL ?? "").match(
  /^https?:\/\/[^/]+/,
)?.[0];

// Held rather than sent, because a keystroke is not worth a redraw. It goes into state when Run is
// pressed, which is also what leaves the command that ran sitting in the box afterwards.
let command = shell.getState().cmd;

shell.onAction("typed", (value) => {
  command = String(value);
});

shell.onAction("run", async () => {
  shell.setState({ cmd: command, status: "running", exit: "-", lines: [] });

  try {
    const response = await fetch(`${devServer}/exec-experiment/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cmd: command }),
    });
    const result = await response.json();
    const output = `${result.stdout}${result.stderr}`.trimEnd();

    shell.setState({
      status: "done",
      exit: String(result.code),
      lines: output ? output.split("\n").map((line) => [line]) : [],
    });
  } catch (error) {
    shell.setState({ status: "failed", lines: [[String(error)]] });
  }
});

/**
 * The other way to fill a tab: a component of your own, with React in it.
 *
 * The path, not the component. The panel is a separate engine, so a function has nothing to send and
 * importing it here would put `react-dom` in the app's bundle. The dev server reads this path,
 * builds it for the browser and serves it.
 */
ReactNativeDevtoolsPanel.registerTab({
  id: "react",
  name: "React",
  icon: "⚛",
  component: PanelUI,
});
