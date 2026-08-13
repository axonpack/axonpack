import { EventEmitter } from 'expo';
import type { ImageSourcePropType } from 'react-native';

export type AppIdentity = {
  icon?: ImageSourcePropType;
};

type AppIdentityEvents = {
  change: () => void;
};

let identity: AppIdentity = {};
const emitter = new EventEmitter<AppIdentityEvents>();

/**
 * The host app's own icon, shown in the panel header in place of this package's mark. There was a `name`
 * here too; the header is the tab bar now, and a title had nowhere left to go.
 *
 * A store rather than a `DevtoolsOverlay` prop because the values arrive through
 * `createDevtoolsClient`, which a consumer calls from its own module — the overlay is mounted
 * somewhere else in the tree entirely and never sees that config object.
 */
export const appIdentityStore = {
  getSnapshot(): AppIdentity {
    return identity;
  },
  subscribe(listener: () => void) {
    const subscription = emitter.addListener('change', listener);
    return () => subscription.remove();
  },
  set(next: AppIdentity) {
    identity = next;
    emitter.emit('change');
  },
};
