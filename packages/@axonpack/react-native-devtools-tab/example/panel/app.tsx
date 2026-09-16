import { useEffect, useState } from "react";

import { createPanelChannel } from "@axonpack/react-native-devtools-tab/panel";

/**
 * A component built for the browser, and run there.
 *
 * The other tab's component runs in the app, which is enough for most things. This one is for what
 * that cannot do: it holds real elements, so a ref, a measurement or a DOM library all work. The
 * price is that it is a separate file the dev server builds, and it talks to the app by message
 * rather than by calling it.
 */
const channel = createPanelChannel();

export default function Tab() {
  const [tick, setTick] = useState("waiting");
  const [width, setWidth] = useState(0);
  const [answer, setAnswer] = useState("");

  // `onMessage` returns its own unsubscribe, which is what an effect wants back.
  useEffect(
    () => channel.onMessage("clock", (value) => setTick(String(value))),
    [],
  );

  const call = async (method: string) => {
    setAnswer("...");
    try {
      setAnswer(String(await channel.request(method)));
    } catch (error) {
      setAnswer(String(error));
    }
  };

  return (
    <main style={{ padding: 12 }}>
      <h1 style={{ fontSize: 13 }}>Built for the browser</h1>
      <p>
        from the app: <b>{tick}</b>
      </p>

      {/* A real element, which is the whole reason this tab is a page rather than a component. */}
      <p>
        <span
          ref={(node) => setWidth(node?.getBoundingClientRect().width ?? 0)}
          style={{ border: "1px solid #444", padding: 4 }}
        >
          measure me
        </span>{" "}
        is {Math.round(width)}px wide
      </p>

      <p>
        <button onClick={() => void call("ping")}>ping the app</button>{" "}
        <button onClick={() => void call("boom")}>make it throw</button>
      </p>
      <pre>{answer}</pre>
    </main>
  );
}
