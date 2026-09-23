import { useState } from 'react';

/**
 * A text field the app can also change. Uncontrolled, because a controlled `value` is put back by
 * the page's React on every keystroke, before the app has heard of it, and the typing is lost. So it
 * remounts instead, only when the value changes from somewhere other than this field.
 */
export function SyncedInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
}) {
  const [sent, setSent] = useState(value);
  const [generation, setGeneration] = useState(0);
  if (value !== sent) {
    setSent(value);
    setGeneration((current) => current + 1);
  }

  return (
    <input
      key={generation}
      defaultValue={value}
      placeholder={placeholder}
      aria-label={placeholder}
      spellCheck={false}
      onChange={(event) => {
        const next = String(event.target.value ?? '');
        setSent(next);
        onChange(next);
      }}
    />
  );
}
