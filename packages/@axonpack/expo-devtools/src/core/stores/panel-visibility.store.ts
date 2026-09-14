import { EventEmitter } from 'expo';

type PanelVisibilityEvents = {
  change: () => void;
};

/**
 * Whether the panel is open.
 *
 * A store rather than state inside the overlay because the launcher button is optional: an app that
 * hides it opens the panel from its own UI through `useDevtoolsPanel`, and that call site is
 * nowhere near the component holding the modal.
 */
let open = false;

const emitter = new EventEmitter<PanelVisibilityEvents>();

function set(next: boolean) {
  if (open === next) return;
  open = next;
  emitter.emit('change');
}

export const panelVisibilityStore = {
  isOpen(): boolean {
    return open;
  },
  subscribe(listener: () => void) {
    const subscription = emitter.addListener('change', listener);
    return () => subscription.remove();
  },
  show() {
    set(true);
  },
  hide() {
    set(false);
  },
  toggle() {
    set(!open);
  },
};
