import { useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';

import { useCrashDetailStyles } from './shared.styles';
import { formatFrameLocation } from '../../../../core/utils/frame-location.util';
import { animateNextLayout } from '../../../../core/utils/layout-animation.util';
import type { StackFrame } from '../../../../core/utils/parse-stack.util';

export function StackFrames({ frames }: { frames: StackFrame[] }) {
  const styles = useCrashDetailStyles();
  const [showVendor, setShowVendor] = useState(false);
  const [revealed, setRevealed] = useState<number | null>(null);

  if (frames.length === 0) {
    return <Text style={styles.emptyText}>No stack was recorded for this error</Text>;
  }

  const rows = frames.map((frame, index) => ({ frame, index }));
  const appRows = rows.filter((row) => !row.frame.vendor);
  // A trace that is *all* library frames is still the trace, so there is nothing to collapse it
  // behind — hiding every row would leave the section reading as empty.
  const collapsible = appRows.length > 0 && appRows.length < rows.length;
  const visible = collapsible && !showVendor ? appRows : rows;
  const hidden = rows.length - appRows.length;

  return (
    <View>
      {/* A frame is one line by definition: wrapped, its location tail reads as a frame of its own
          and the index gutter stops lining up. So the list scrolls sideways rather than reflowing. */}
      <ScrollView horizontal contentContainerStyle={styles.frameScrollContent}>
        <View>
          {visible.map(({ frame, index }) => (
            <TouchableOpacity
              // Frames are positional and can repeat verbatim in a recursive trace, so the index is
              // the only stable identity available.
              key={`${index}-${frame.fn}-${frame.location}`}
              activeOpacity={0.6}
              onPress={() => setRevealed(revealed === index ? null : index)}
              style={[styles.frameRow, frame.vendor && styles.frameVendor]}>
              <Text style={styles.frameIndex}>{index}</Text>
              <View style={styles.frameBody}>
                <Text style={styles.frameFn} selectable>
                  {frame.fn}
                </Text>
                {frame.location.length > 0 && (
                  <Text style={styles.frameLocation} selectable>
                    {revealed === index ? frame.location : formatFrameLocation(frame.location)}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Outside the horizontal scroll: it is a control, not a frame, and must not scroll away. */}
      {collapsible && (
        <TouchableOpacity
          onPress={() => {
            animateNextLayout();
            setShowVendor((previous) => !previous);
          }}
          style={styles.frameToggle}>
          <Text style={styles.frameToggleText}>
            {showVendor
              ? `Hide ${hidden} library ${hidden === 1 ? 'frame' : 'frames'}`
              : `See ${hidden} more ${hidden === 1 ? 'frame' : 'frames'}`}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
