import { ScrollView, Text, View } from 'react-native';

import { useCrashDetailStyles } from './shared.styles';
import type { StackFrame } from '../../utils/parse-stack.util';

export function StackFrames({ frames }: { frames: StackFrame[] }) {
  const styles = useCrashDetailStyles();

  if (frames.length === 0) {
    return <Text style={styles.emptyText}>No stack was recorded for this error</Text>;
  }

  return (
    // A frame is one line by definition: wrapped, its location tail reads as a frame of its own and
    // the index gutter stops lining up. So the list scrolls sideways rather than reflowing.
    <ScrollView horizontal contentContainerStyle={styles.frameScrollContent}>
      <View>
        {frames.map((frame, index) => (
          <View
            // Frames are positional and can repeat verbatim in a recursive trace, so the index is the
            // only stable identity available.
            key={`${index}-${frame.fn}-${frame.location}`}
            style={[styles.frameRow, frame.vendor && styles.frameVendor]}>
            <Text style={styles.frameIndex}>{index}</Text>
            <View style={styles.frameBody}>
              <Text style={styles.frameFn} selectable>
                {frame.fn}
              </Text>
              {frame.location.length > 0 && (
                <Text style={styles.frameLocation} selectable>
                  {frame.location}
                </Text>
              )}
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
