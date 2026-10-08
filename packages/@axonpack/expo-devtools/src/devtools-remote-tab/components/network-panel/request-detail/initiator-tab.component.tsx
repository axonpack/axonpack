import { useEffect, useState } from 'react';

import {
  symbolicateStack,
  type SymbolicatedStack,
} from '../../../../core/services/symbolicate-stack.service';
import { isMarkedCodeFrameLine } from '../../../../core/utils/code-frame.util';
import { formatFrameLocation } from '../../../../core/utils/frame-location.util';
import type { StackFrame } from '../../../../core/utils/parse-stack.util';

type State =
  { phase: 'loading' } | { phase: 'raw' } | { phase: 'symbolicated'; result: SymbolicatedStack };

// One empty list for every row with no stack, so the effect below does not see a new one each render.
const NO_FRAMES: StackFrame[] = [];

/**
 * Chrome's request call stack. Symbolicated on opening, as in the app, through the same service, so
 * a stack opened on either side is looked up once. The Navigation panel shows a move's origin with
 * it too, which is the same question about a different row.
 */
export function InitiatorTab({
  id,
  frames: captured = NO_FRAMES,
  title = 'Request call stack',
}: {
  /** What the symbolication cache is keyed by: the row the stack belongs to. */
  id: string;
  frames?: StackFrame[];
  title?: string;
}) {
  const [state, setState] = useState<State>({ phase: 'loading' });

  useEffect(() => {
    let active = true;
    setState({ phase: 'loading' });
    symbolicateStack(id, captured).then((result) => {
      if (active) setState(result ? { phase: 'symbolicated', result } : { phase: 'raw' });
    });
    return () => {
      active = false;
    };
  }, [id, captured]);

  const frames = state.phase === 'symbolicated' ? state.result.frames : captured;
  const codeFrame = state.phase === 'symbolicated' ? state.result.codeFrames[0] : undefined;

  return (
    <div>
      {state.phase === 'loading' && <p className="axonpack-net-none">Symbolicating…</p>}
      {state.phase === 'raw' && (
        <p className="axonpack-net-none">
          Not symbolicated. No development server answered, so these are bundle positions.
        </p>
      )}
      {codeFrame && (
        <div className="axonpack-net-codeframe">
          <div className="axonpack-net-codeframe-file">{codeFrame.fileName}</div>
          {codeFrame.content.split('\n').map((line, index) => (
            <div key={`${index}-${line}`} data-marked={isMarkedCodeFrameLine(line) || undefined}>
              {line}
            </div>
          ))}
        </div>
      )}
      <details open className="axonpack-net-section">
        <summary>{title}</summary>
        <div className="axonpack-net-stack">
          {frames.map((frame, index) => (
            <div key={`${index}-${frame.location}`} data-vendor={frame.vendor || undefined}>
              <span>{frame.fn}</span>
              <span>{formatFrameLocation(frame.location)}</span>
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}
