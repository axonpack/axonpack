import type { StorageAdapterState } from '../../../features/storage/stores/storage.store';
import { summarizeStorage } from '../../../features/storage/utils/summary.util';

/**
 * The read error and every note the app's summary makes. The store's name, kind and last read are
 * in the toolbar, beside the store picker.
 */
export function StorageSummary({ state }: { state: StorageAdapterState }) {
  const { notes } = summarizeStorage(state);
  if (state.status !== 'error' && notes.length === 0) return null;

  return (
    <div className="axonpack-sto-summary">
      {state.status === 'error' && (
        <p className="axonpack-sto-note" data-tone="error">
          {state.error}
        </p>
      )}
      {notes.map((note) => (
        <p key={note} className="axonpack-sto-note">
          {note}
        </p>
      ))}
    </div>
  );
}
