import { useMemo } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { useCrashDetailStyles } from './shared.styles';
import { StackFrames } from './stack-frames.component';
import { CollapsibleSection } from '../../../../core/components/ui/collapsible-section.ui';
import type { CrashRecord } from '../../stores/crash.store';
import { parseComponentStack, parseStack } from '../../utils/parse-stack.util';

export function StackSection({ record }: { record: CrashRecord }) {
  const styles = useCrashDetailStyles();

  const frames = useMemo(() => parseStack(record.stack), [record.stack]);
  const componentFrames = useMemo(
    () => parseComponentStack(record.componentStack),
    [record.componentStack]
  );
  const nativeFrames = record.native?.frames;

  return (
    <View>
      <CollapsibleSection title="Stack" count={frames.length}>
        <StackFrames frames={frames} />

        {/* Stated rather than papered over: a release bundle is minified and this package ships no
            source maps, so the frames above point into the bundle, not your source. */}
        {!__DEV__ && frames.length > 0 && (
          <Text style={styles.note}>
            Release build — frames refer to the minified bundle. Symbolicate them against the source
            map produced for this build.
          </Text>
        )}
      </CollapsibleSection>

      {componentFrames.length > 0 && (
        <CollapsibleSection title="Component Stack" count={componentFrames.length}>
          <StackFrames frames={componentFrames} />
        </CollapsibleSection>
      )}

      {nativeFrames?.length ? (
        <CollapsibleSection title="Native Frames" count={nativeFrames.length}>
          <ScrollView horizontal contentContainerStyle={styles.frameScrollContent}>
            <Text style={styles.monospace} selectable>
              {nativeFrames.join('\n')}
            </Text>
          </ScrollView>
        </CollapsibleSection>
      ) : null}
    </View>
  );
}
