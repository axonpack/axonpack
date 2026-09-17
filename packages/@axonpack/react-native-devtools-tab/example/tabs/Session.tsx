import { countRequest, session } from "../session";

/**
 * Reads the app, and writes back to it.
 *
 * `session.use()` is the same hook the app's own screen calls, on the same object, so neither side
 * has to tell the other anything.
 */
export default function Session() {
  const { user, requests } = session.use();

  return (
    <div style={{ padding: 12 }}>
      <p>
        user <b>{user}</b>
      </p>
      <p>
        requests <b>{requests}</b>
      </p>

      <p>
        <button
          onClick={() => session.set({ user: "ada@example.com", requests })}
        >
          Sign in
        </button>{" "}
        <button onClick={() => session.set({ user: "nobody", requests })}>
          Sign out
        </button>{" "}
        <button onClick={countRequest}>Count a request</button>
      </p>
    </div>
  );
}
