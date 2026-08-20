import { useEffect, useSyncExternalStore } from 'react';

import { CrashDetailSheet } from './crash-detail';
import { crashInspectionStore } from '../../../core/stores/crash-inspection.store';
import { crashStore } from '../stores/crash.store';

/**
 * The crash report as opened from outside the Crashes tab — today, a console error row linked to the
 * crash it caused. The sheet itself stays owned by this feature and the id arrives through a `core/`
 * store, which is what keeps the console side free of any crash import.
 */
export function CrashInspectionSheet() {
  const inspectedId = useSyncExternalStore(
    crashInspectionStore.subscribe,
    crashInspectionStore.getSnapshot
  );
  const records = useSyncExternalStore(crashStore.subscribe, crashStore.getSnapshot);

  const record =
    inspectedId === null ? null : (records.find((current) => current.id === inspectedId) ?? null);

  // Reading a report clears it from the tab badge, exactly as opening it from the list does.
  useEffect(() => {
    if (inspectedId !== null) crashStore.markSeen(inspectedId);
  }, [inspectedId]);

  return <CrashDetailSheet record={record} onClose={crashInspectionStore.close} />;
}
