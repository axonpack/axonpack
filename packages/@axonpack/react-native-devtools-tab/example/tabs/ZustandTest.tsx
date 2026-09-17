import { useZustandTest } from "../zustand-test";
import ZustandScreen from "../ZustandScreen";

/**
 * The zustand store, drawn in the panel.
 *
 * Nothing bridges it. The hook is called here, in the app, by the app's own React, and what it
 * returns reaches the panel as the text of these elements. The JSON below is the whole store state,
 * printed rather than picked apart, so a shape that failed to cross would be visible.
 */
export default function ZustandTest() {
  const { count, theme, items, increment, toggleTheme, addItem } =
    useZustandTest();

  return (
    <div style={{ padding: 12, borderTop: "1px solid #3c3c3c" }}>
      <p>
        <b>zustand test</b>
      </p>

      <p>
        count <b>{count}</b>, theme <b>{theme}</b>, items <b>{items.length}</b>
      </p>

      <pre style={{ margin: 0, fontSize: 11, opacity: 0.8 }}>
        {JSON.stringify({ count, theme, items }, null, 2)}
      </pre>

      <p>
        <button onClick={increment}>Increment</button>{" "}
        <button onClick={toggleTheme}>Toggle theme</button>{" "}
        <button onClick={addItem}>Add an item</button>
      </p>
      <ZustandScreen />
    </div>
  );
}
