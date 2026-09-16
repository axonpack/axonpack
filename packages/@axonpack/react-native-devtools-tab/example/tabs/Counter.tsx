import { useEffect, useState } from "react";

/**
 * The tab this package used to need a described layout and a slice of state for.
 *
 * It is a component now, so the tick is a `useState` and the button is an `onClick`. Nothing is
 * registered, nothing is named, and nothing crosses the wire but what changed.
 */
export default function Counter() {
  const [tick, setTick] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setTick((value) => value + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div style={{ padding: 12 }}>
      <h1 style={{ fontSize: 13 }}>Counter</h1>
      <p>
        tick <b>{tick}</b>
      </p>
      <p style={{ color: busy ? "#e0b050" : "#6ac48a" }}>
        {busy ? "busy" : "idle"}
      </p>
      <button onClick={() => setBusy(!busy)}>Toggle busy</button>
    </div>
  );
}
