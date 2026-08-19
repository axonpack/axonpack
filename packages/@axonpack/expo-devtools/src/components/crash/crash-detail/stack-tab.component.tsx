import { useMemo } from 'react';
import { Text, View } from 'react-native';

import { useCrashDetailStyles } from './shared.styles';
import { StackFrames } from './stack-frames.component';
import type { CrashRecord } from '../../../stores/crash/crash.store';
import { parseComponentStack, parseStack } from '../../../utils/crash/parse-stack.util';

export function StackTab({ record }: { record: CrashRecord }) {
  const styles = useCrashDetailStyles();

  const frames = useMemo(() => parseStack(record.stack), [record.stack]);
  const componentFrames = useMemo(
    () => parseComponentStack(record.componentStack),
    [record.componentStack]
  );

  return (
    <View style={styles.section}>
      <StackFrames frames={frames} />

      {componentFrames.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Component stack</Text>
          <StackFrames frames={componentFrames} />
        </>
      )}

      {record.native?.frames?.length ? (
        <>
          <Text style={styles.sectionTitle}>Native frames</Text>
          <Text style={styles.monospace} selectable>
            {record.native.frames.join('\n')}
          </Text>
        </>
      ) : null}

      {/* Stated rather than papered over: a release bundle is minified and this package ships no
          source maps, so the frames above point into the bundle, not your source. */}
      {!__DEV__ && frames.length > 0 && (
        <Text style={styles.note}>
          Release build — frames refer to the minified bundle. Symbolicate them against the source
          map produced for this build.
        </Text>
      )}
    </View>
  );
}
