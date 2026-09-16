import { useEffect, useState } from "react";

import { counter, toggleBusy } from "./devtools";

/**
 * A tab drawn by an ordinary React component.
 *
 * This runs in the app, not in the panel. That is why it can call `toggleBusy` directly: the app's
 * own state is right here, with no message to send. What crosses to the panel is only what React
 * drew, which is why the JSX below is `div` and `button` rather than `View` and `Pressable`.
 */
export default function PanelUI() {
  const [seconds, setSeconds] = useState(0);
  const [note, setNote] = useState("");

  useEffect(() => {
    const timer = setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div style={{ padding: 12, fontFamily: "ui-monospace, Menlo, monospace" }}>
      <h1 style={{ fontSize: 13 }}>Rendered by React, in the app</h1>

      <p>
        open for <b>{seconds}s</b>
      </p>

      <p>
        <button onClick={() => setSeconds(0)}>reset</button>{" "}
        <button onClick={toggleBusy}>
          toggle the Counter tab ({counter.getState().busy ? "busy" : "idle"})
        </button>
      </p>

      {/* The caret stays put as this re-renders, because the panel is sent changes, not a new tree. */}
      <p>
        <input
          value={note}
          placeholder="type here while the clock runs"
          onChange={(event) => setNote(event.target.value)}
          style={{ width: 280 }}
        />
      </p>

      {note ? <pre>{note}</pre> : null}
    </div>
  );
}
