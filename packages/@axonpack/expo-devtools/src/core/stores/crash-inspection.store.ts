import { EventEmitter } from 'expo';

type CrashInspectionEvents = {
  change: () => void;
};

let inspectedId: string | null = null;
const emitter = new EventEmitter<CrashInspectionEvents>();

/**
 * Which crash report the panel is showing over whatever tab is open — currently asked for by a
 * console error row that is linked to the crash it caused.
 *
 * A store rather than a prop because the two ends never meet: the Console tab asks, the Crashes tab
 * answers, and the panel shell is what mounts the sheet. Opening a report this way deliberately does
 * *not* switch tabs — the point is to read it without losing the console's filters and scroll.
 */
export const crashInspectionStore = {
  getSnapshot(): string | null {
    return inspectedId;
  },
  subscribe(listener: () => void) {
    const subscription = emitter.addListener('change', listener);
    return () => subscription.remove();
  },
  open(id: string) {
    inspectedId = id;
    emitter.emit('change');
  },
  close() {
    inspectedId = null;
    emitter.emit('change');
  },
};
