/** Structural, because each store types its emitter with its own event map. */
type ChangeEmitter = {
  listenerCount(eventName: 'change'): number;
  emit(eventName: 'change'): void;
};

/**
 * Turns a stream of store changes into at most one notification per frame, and none at all while
 * nothing is listening.
 *
 * A log store is written to once per line, and a chatty app writes far more lines per frame than a
 * list can usefully redraw — without this, a burst of a hundred logs is a hundred renders of every
 * view subscribed to the store. The entries are in the buffer the moment they are added either way;
 * this only decides how often anything is told to look, which is all `useSyncExternalStore` needs.
 *
 * The listener check is the bigger half in a real app: with the panel closed, nothing subscribes,
 * and recording then costs an array write and nothing else.
 */
export function coalesceNotify(emitter: ChangeEmitter): () => void {
  let scheduled = false;

  return () => {
    if (scheduled || emitter.listenerCount('change') === 0) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      emitter.emit('change');
    });
  };
}
