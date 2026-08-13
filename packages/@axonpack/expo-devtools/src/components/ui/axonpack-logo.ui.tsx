import { Image, StyleSheet } from 'react-native';

import { AXONPACK_LOGO_URI } from '../../constants/logo.const';

export function AxonpackLogo({ size = 18 }: { size?: number }) {
  return (
    <Image
      source={{ uri: AXONPACK_LOGO_URI }}
      style={[styles.logo, { width: size, height: size, borderRadius: size / 5 }]}
      resizeMode="contain"
      accessibilityLabel="axonpack"
    />
  );
}

const styles = StyleSheet.create({
  logo: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#00000014',
  },
});
