import type { SearchModes } from '../../../core/utils/text-search.util';
import { SyncedInput } from '../network-panel/synced-input.component';

const MODES: { key: keyof SearchModes; icon: string; title: string }[] = [
  { key: 'matchCase', icon: 'match-case', title: 'Match case' },
  { key: 'wholeWord', icon: 'match-whole-word', title: 'Match whole word' },
  { key: 'regex', icon: 'regular-expression', title: 'Use regular expression' },
];

/** The filter box with its clear button and the three modes, as the Network filter bar draws it. */
export function SearchField({
  value,
  onChange,
  modes,
  onModesChange,
  placeholder,
  invalid,
}: {
  value: string;
  onChange: (next: string) => void;
  modes: SearchModes;
  onModesChange: (next: SearchModes) => void;
  placeholder: string;
  invalid: boolean;
}) {
  return (
    <span className="axonpack-net-filter" data-icon="filter" data-invalid={invalid || undefined}>
      <SyncedInput value={value} onChange={onChange} placeholder={placeholder} />
      {value.length > 0 && (
        <button
          className="axonpack-net-button"
          data-icon="cross-circle-filled"
          title="Clear"
          onClick={() => onChange('')}
        />
      )}
      {MODES.map((mode) => (
        <button
          key={mode.key}
          className="axonpack-net-button"
          data-icon={mode.icon}
          aria-pressed={modes[mode.key]}
          title={mode.title}
          onClick={() => onModesChange({ ...modes, [mode.key]: !modes[mode.key] })}
        />
      ))}
    </span>
  );
}
