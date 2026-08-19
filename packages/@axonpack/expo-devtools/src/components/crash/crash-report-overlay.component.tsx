import { useEffect, useState, useSyncExternalStore } from 'react';
import { Modal, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { CompactCrashSheet } from './compact-crash-sheet.component';
import { CrashDetailSheet } from './crash-detail';
import { getCrashPopupDetail } from '../../services/crash/crash-popup.service';
import { crashStore } from '../../stores/crash/crash.store';
import { makeThemedStyles } from '../../utils/themed-styles.util';

/**
 * `DevtoolsOverlay` mounts one of these itself, and a production build mounts one directly — an app
 * doing both would otherwise stack two identical modals. The first instance to mount wins and the
 * rest render nothing, so mounting it twice is harmless rather than something to get right.
 */
let mountedInstances = 0;

export function CrashReportOverlay() {
  const styles = useStyles();
  const records = useSyncExternalStore(crashStore.subscribe, crashStore.getSnapshot);

  const [isPrimary, setIsPrimary] = useState(false);
  const [dismissedId, setDismissedId] = useState<string | null>(null);

  useEffect(() => {
    mountedInstances += 1;
    const primary = mountedInstances === 1;
    setIsPrimary(primary);
    return () => {
      mountedInstances -= 1;
    };
  }, []);

  if (!isPrimary) return null;

  /**
   * Newest first, so a crash that arrives while an older report is open replaces it — the one that
   * just happened is the one worth reading. Records from a previous launch are unseen too, which is
   * what makes a process-killing crash surface at the next start.
   */
  const pending = records.find((record) => !record.seen && record.id !== dismissedId) ?? null;

  /**
   * Read per render rather than captured once: `init()` may not have run yet the first time this
   * mounts, and the default is the safe one either way.
   */
  const compact = getCrashPopupDetail() === 'compact';

  return (
    <Modal
      visible={pending !== null}
      transparent
      animationType="fade"
      onRequestClose={() => pending && dismiss(pending.id)}>
      <SafeAreaProvider style={styles.provider}>
        <View style={styles.backdrop}>
          {compact ? (
            <CompactCrashSheet record={pending} onClose={() => pending && dismiss(pending.id)} />
          ) : (
            <CrashDetailSheet record={pending} onClose={() => pending && dismiss(pending.id)} />
          )}
        </View>
      </SafeAreaProvider>
    </Modal>
  );

  function dismiss(id: string) {
    setDismissedId(id);
    crashStore.markSeen(id);
  }
}

const useStyles = makeThemedStyles(() => ({
  provider: {
    flex: 1,
  },
  // The sheet positions itself against this, and the transparent modal lets the app show through.
  backdrop: {
    flex: 1,
  },
}));
