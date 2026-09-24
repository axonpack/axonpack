import { CrashRow } from './crash-row.component';
import type { Palette } from '../../../core/constants/theme.const';
import type { CrashRecord } from '../../../features/crash/stores/crash.store';

export function CrashList({
  visible,
  total,
  selectedId,
  palette,
  onSelect,
}: {
  visible: CrashRecord[];
  total: number;
  selectedId: string | null;
  palette: Palette;
  onSelect: (id: string) => void;
}) {
  if (visible.length === 0) {
    return (
      <div className="axonpack-crash-empty">
        <p>{total === 0 ? 'No crashes recorded' : 'No crashes match your filter'}</p>
        {total === 0 && (
          <p>
            Fatal JS errors, unhandled rejections, render errors caught by DevtoolsErrorBoundary,
            and uncaught native exceptions land here. A crash that takes the process down is written
            to disk and reported at the next launch.
          </p>
        )}
      </div>
    );
  }

  return (
    <div role="listbox" aria-label="Crashes">
      {visible.map((record) => (
        <CrashRow
          key={record.id}
          record={record}
          selected={record.id === selectedId}
          palette={palette}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}
