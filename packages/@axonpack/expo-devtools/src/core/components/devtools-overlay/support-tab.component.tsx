import { Text } from 'react-native';

import type { DevtoolsSupport } from '../../stores/supports.store';
import { makeThemedStyles } from '../../utils/themed-styles.util';

/** A support's tab in the panel: why it can't run, or its own content. */
export function SupportTab({ support }: { support: DevtoolsSupport }) {
  const styles = useStyles();
  if (support.error) {
    return (
      <Text selectable style={styles.error}>
        {support.error}
      </Text>
    );
  }
  return support.Tab ? <support.Tab /> : null;
}

const useStyles = makeThemedStyles((COLORS) => ({
  error: {
    margin: 16,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
    color: COLORS.error,
  },
}));
