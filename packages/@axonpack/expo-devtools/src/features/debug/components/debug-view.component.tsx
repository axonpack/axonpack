import { ScrollView, View } from 'react-native';

import { LimiterSection } from './limiter-section.component';
import { makeThemedStyles } from '../../../core/utils/themed-styles.util';
import { InsetPadding } from '../../../core/components/ui/inset-padding.ui';

/**
 * Tools that break the app on purpose, rather than measure it.
 *
 * The Limiter lived under Performance until it moved here, which read as a category error: every
 * other Performance section reports something that happened, while this one goes out and causes it.
 * There is no recording gate and nothing to clear, so the tab carries no toolbar either.
 */
export function DebugView() {
  const styles = useStyles();

  return (
    <View style={styles.container}>
      <ScrollView keyboardShouldPersistTaps="handled">
        <LimiterSection />
        <InsetPadding edge="bottom" />
      </ScrollView>
    </View>
  );
}

const useStyles = makeThemedStyles((COLORS) => ({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
}));
