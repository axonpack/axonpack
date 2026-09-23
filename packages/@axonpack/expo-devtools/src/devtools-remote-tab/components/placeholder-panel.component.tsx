/** Stands in for a panel until its real one is written. */
export function PlaceholderPanel({ title }: { title: string }) {
  return <p style={{ margin: 0, padding: 12 }}>{title} panel</p>;
}
