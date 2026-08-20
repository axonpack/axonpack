import { useEffect, useState, useSyncExternalStore } from 'react';
import { Modal, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { CompactCrashSheet } from './compact-crash-sheet.component';
import { CrashDetailSheet } from './crash-detail';
import { getCrashPopupDetail } from '../services/crash-popup.service';
import { crashOverlayOwnerStore } from '../stores/crash-overlay-owner.store';
import { crashStore } from '../stores/crash.store';
import { makeThemedStyles } from '../../../core/utils/themed-styles.util';

/**
 * Mounting this twice is harmless rather than something to get right: `DevtoolsOverlay` mounts one
 * itself and a production build mounts one directly, and `crashOverlayOwnerStore` hands the sheet to
 * whichever mounted first so the other draws nothing.
 */
export function CrashReportOverlay() {
  const styles = useStyles();
  const records = useSyncExternalStore(crashStore.subscribe, crashStore.getSnapshot);

  /** Identity, not data — this instance's claim on the sheet. */
  const [token] = useState(() => ({}));
  const owner = useSyncExternalStore(
    crashOverlayOwnerStore.subscribe,
    crashOverlayOwnerStore.getOwner
  );
  /**
   * Every record this popup has already offered, which is **not** the same thing as `seen`. `seen`
   * means read: the Crashes tab sets it when a row is opened, and the tab badge counts what is left.
   * A report dismissed out here stays unread in there on purpose.
   */
  const [retiredIds, setRetiredIds] = useState<ReadonlySet<string>>(() => new Set());

  useEffect(() => {
    crashOverlayOwnerStore.claim(token);
    return () => crashOverlayOwnerStore.release(token);
  }, [token]);

  // Nothing until the claim lands, so a second instance never gets one frame of its own modal.
  if (owner !== token) return null;

  /**
   * Newest first, so a crash that arrives while an older report is open replaces it — the one that
   * just happened is the one worth reading. Records from a previous launch are unseen too, which is
   * what makes a process-killing crash surface at the next start.
   */
  const pending = records.find((record) => !record.seen && !retiredIds.has(record.id)) ?? null;

  /**
   * Read per render rather than captured once: `init()` may not have run yet the first time this
   * mounts, and the default is the safe one either way.
   */
  const compact = getCrashPopupDetail() === 'compact';

  return (
    <Modal visible={pending !== null} transparent animationType="fade" onRequestClose={dismiss}>
      <SafeAreaProvider style={styles.provider}>
        <View style={styles.backdrop}>
          {compact ? (
            <CompactCrashSheet record={pending} onClose={dismiss} />
          ) : (
            <CrashDetailSheet record={pending} onClose={dismiss} />
          )}
        </View>
      </SafeAreaProvider>
    </Modal>
  );

  /**
   * Retires the whole backlog, not just the report on screen.
   *
   * One launch can drain a pile of records at once — every `js-fatal` of the previous session is on
   * disk and the app stayed up for all of them — and dismissing the newest used to put the next one
   * straight back up in the same sheet. Nothing animates between the two, so the only thing that
   * changes is a line of message text: the exit button reads as dead, and with a dozen records
   * queued the sheet cannot be got rid of at all. Nothing is lost — the records are all still in the
   * store, still unread, waiting in the Crashes tab.
   *
   * Takes no argument and tolerates `pending` being null so that no exit is ever a no-op: the sheets
   * keep rendering the last report while they animate out, and a tap in that window used to fall
   * through a `pending &&` guard.
   */
  function dismiss() {
    if (pending) crashStore.markSeen(pending.id);
    setRetiredIds(new Set(records.map((record) => record.id)));
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
