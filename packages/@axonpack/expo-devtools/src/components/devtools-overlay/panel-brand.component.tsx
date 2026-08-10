import { useSyncExternalStore } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { COLORS } from '../../constants/colors.const';
import { appIdentityStore } from '../../stores/app-identity.store';
import { AxonpackLogo } from '../ui/axonpack-logo.ui';

const ICON_SIZE = 20;

/** Falls back to this package's own mark and name until a consumer supplies `app` on the client. */
export function PanelBrand() {
  const { name, icon } = useSyncExternalStore(
    appIdentityStore.subscribe,
    appIdentityStore.getSnapshot
  );

  return (
    <View style={styles.brand}>
      {/* The icon is decorative — the title beside it carries the name to a screen reader. */}
      {icon ? (
        <Image source={icon} style={styles.icon} resizeMode="contain" />
      ) : (
        <AxonpackLogo size={ICON_SIZE} />
      )}
      <Text style={styles.title} numberOfLines={1}>
        {name ?? '@axonpack/expo-devtools'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  // Takes the row's spare width so a long app name truncates instead of pushing the close button
  // off the header.
  brand: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  icon: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    borderRadius: ICON_SIZE / 5,
  },
  title: {
    flexShrink: 1,
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
});
