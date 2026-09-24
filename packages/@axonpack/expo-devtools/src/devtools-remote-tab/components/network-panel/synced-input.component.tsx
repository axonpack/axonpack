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
  label = placeholder,
  multiline = false,
  type,
  autoFocus,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  /** For a field whose placeholder is not its name, or that has none. */
  label?: string;
  /** A `textarea`, for a body. Uncontrolled the same way, which matters more at that size. */
  multiline?: boolean;
  /** An `input`'s type, for a secret to hide. A change swaps the field, and keeps what was typed. */
  type?: 'text' | 'password';
  /** Taken again on every remount, so a field whose value is set from outside keeps the caret. */
  autoFocus?: boolean;
}) {
  const [sent, setSent] = useState(value);
  const [generation, setGeneration] = useState(0);
  if (value !== sent) {
    setSent(value);
    setGeneration((current) => current + 1);
  }

  const Field = multiline ? 'textarea' : 'input';

  return (
    <Field
      key={generation}
      defaultValue={value}
      placeholder={placeholder}
      aria-label={label}
      type={multiline ? undefined : type}
      autoFocus={autoFocus}
      spellCheck={false}
      onChange={(event) => {
        const next = String(event.target.value ?? '');
        setSent(next);
        onChange(next);
      }}
    />
  );
}
