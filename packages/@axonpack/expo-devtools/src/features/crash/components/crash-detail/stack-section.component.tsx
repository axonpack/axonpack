import { useEffect, useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { useCrashDetailStyles } from './shared.styles';
import { SourceFrames } from './source-frames.component';
import { StackFrames } from './stack-frames.component';
import { CollapsibleSection } from '../../../../core/components/ui/collapsible-section.ui';
import { symbolicateStack, type SymbolicatedStack } from '../../services/symbolicate-stack.service';
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

  const [symbolicated, setSymbolicated] = useState<SymbolicatedStack | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let active = true;
    setSymbolicated(null);
    setPending(true);

    symbolicateStack(record.id, frames, componentFrames).then((result) => {
      if (!active) return;
      setSymbolicated(result);
      setPending(false);
    });

    return () => {
      active = false;
    };
  }, [record.id, frames, componentFrames]);

  const displayFrames = symbolicated?.frames ?? frames;
  const displayComponentFrames = symbolicated?.componentFrames ?? componentFrames;

  return (
    <View>
      {symbolicated && <SourceFrames codeFrames={symbolicated.codeFrames} />}

      <CollapsibleSection
        title="Stack"
        count={displayFrames.length}
        headerRight={pending ? <Text style={styles.note}>symbolicating…</Text> : undefined}>
        <StackFrames frames={displayFrames} />

        {/* Stated rather than papered over: a release bundle is minified, this package ships no
            source maps and there is no dev server to ask, so the frames point into the bundle. */}
        {!__DEV__ && frames.length > 0 && symbolicated === null && (
          <Text style={styles.note}>
            Release build — frames refer to the minified bundle. Symbolicate them against the source
            map produced for this build.
          </Text>
        )}
      </CollapsibleSection>

      {displayComponentFrames.length > 0 && (
        <CollapsibleSection title="Component Stack" count={displayComponentFrames.length}>
          <StackFrames frames={displayComponentFrames} />
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
