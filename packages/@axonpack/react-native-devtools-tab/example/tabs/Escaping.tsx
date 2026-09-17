/**
 * Text is text.
 *
 * The panel builds nodes and sets their text rather than writing markup, so a string that looks like
 * an element renders as that string. Worth a tab of its own, because the failure would be silent.
 */
const hostile = '<img src=x onerror="alert(1)">';

export default function Escaping() {
  return (
    <div style={{ padding: 12 }}>
      <h1 style={{ fontSize: 13 }}>Text is text</h1>
      <p>{hostile}</p>
      <pre>{JSON.stringify({ hostile }, null, 2)}</pre>
    </div>
  );
}
