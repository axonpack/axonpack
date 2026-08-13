import { useSyncExternalStore } from 'react';
import { Image, StyleSheet } from 'react-native';

import { appIdentityStore } from '../../stores/app-identity.store';
import { AxonpackLogo } from '../ui/axonpack-logo.ui';

const ICON_SIZE = 24;

/**
 * The host app's mark, or this package's own until a consumer passes `icon` to the client.
 *
 * Decorative: it names nothing a screen reader needs, and the tabs beside it say where you are. It used
 * to sit next to an app name, which is gone — the header row is the tab bar now, and a title competing
 * with three tabs for the same width left no room for either.
 */
export function PanelAppIcon() {
  const { icon } = useSyncExternalStore(appIdentityStore.subscribe, appIdentityStore.getSnapshot);

  if (!icon) return <AxonpackLogo size={ICON_SIZE} />;
  return <Image source={icon} style={styles.icon} resizeMode="contain" />;
}

const styles = StyleSheet.create({
  icon: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    borderRadius: ICON_SIZE / 5,
  },
});
