export function Checkbox({
  label,
  title,
  checked,
  onChange,
}: {
  label: string;
  title?: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <label className="axonpack-net-checkbox" title={title}>
      <input type="checkbox" checked={checked} onChange={() => onChange(!checked)} />
      {label}
    </label>
  );
}
