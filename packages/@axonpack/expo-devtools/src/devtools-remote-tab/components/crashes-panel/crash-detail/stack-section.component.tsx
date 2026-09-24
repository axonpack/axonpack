import { useEffect, useMemo, useState } from 'react';

import { SourceFrames } from './source-frames.component';
import { StackFrames } from './stack-frames.component';
import {
  symbolicateStack,
  type SymbolicatedStack,
} from '../../../../core/services/symbolicate-stack.service';
import { parseComponentStack, parseStack } from '../../../../core/utils/parse-stack.util';
import type { CrashRecord } from '../../../../features/crash/stores/crash.store';

/**
 * Sources, then the stack, the component stack and the native frames, symbolicated on opening
 * through the app's service. It caches by record id, so a report already opened on the phone is not
 * looked up again.
 */
export function StackSection({ record }: { record: CrashRecord }) {
  const frames = useMemo(() => parseStack(record.stack), [record.stack]);
  const componentFrames = useMemo(
    () => parseComponentStack(record.componentStack),
    [record.componentStack]
  );
  // Keyed by the record it answers, so a newly opened report reads as pending without an effect
  // having to reset anything first.
  const [answer, setAnswer] = useState<{ id: string; result: SymbolicatedStack | null } | null>(
    null
  );

  useEffect(() => {
    let active = true;
    symbolicateStack(record.id, frames, componentFrames).then((result) => {
      if (active) setAnswer({ id: record.id, result });
    });
    return () => {
      active = false;
    };
  }, [record.id, frames, componentFrames]);

  const pending = answer?.id !== record.id;
  const symbolicated = pending ? null : answer.result;
  const shownFrames = symbolicated?.frames ?? frames;
  const shownComponentFrames = symbolicated?.componentFrames ?? componentFrames;
  const nativeFrames = record.native?.frames;

  return (
    <>
      {symbolicated && <SourceFrames codeFrames={symbolicated.codeFrames} />}
      <details open className="axonpack-net-section">
        <summary>
          Stack ({shownFrames.length}){pending ? ' · symbolicating…' : ''}
        </summary>
        <StackFrames frames={shownFrames} />
      </details>
      {shownComponentFrames.length > 0 && (
        <details open className="axonpack-net-section">
          <summary>Component Stack ({shownComponentFrames.length})</summary>
          <StackFrames frames={shownComponentFrames} />
        </details>
      )}
      {nativeFrames?.length ? (
        <details open className="axonpack-net-section">
          <summary>Native Frames ({nativeFrames.length})</summary>
          <pre className="axonpack-crash-native">{nativeFrames.join('\n')}</pre>
        </details>
      ) : null}
    </>
  );
}
