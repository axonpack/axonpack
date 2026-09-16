import { DevTools, ref } from "@axonpack/react-native-devtools-tab";

/**
 * A tab per thing worth checking. Each layout crosses the wire once, at registration; after that
 * only the slices below do.
 */

export const gallery = DevTools.registerTab({
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

export const counter = DevTools.registerTab({
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
export const escaping = DevTools.registerTab({
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
DevTools.expose({
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
}, 1000);

export function toggleBusy(): void {
  counter.setState({ busy: !counter.getState().busy });
}
