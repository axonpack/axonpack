import type { CodeFrame } from '../../../../core/services/symbolicate-stack.service';
import { isMarkedCodeFrameLine } from '../../../../core/utils/code-frame.util';
import { formatFrameLocation } from '../../../../core/utils/frame-location.util';

/** Where it threw, and for a render error which element rendered it. Plural only when both. */
export function SourceFrames({ codeFrames }: { codeFrames: CodeFrame[] }) {
  if (codeFrames.length === 0) return null;

  return (
    <details open className="axonpack-net-section">
      <summary>{codeFrames.length > 1 ? 'Sources' : 'Source'}</summary>
      <div className="axonpack-crash-codeframes">
        {codeFrames.map((codeFrame, index) => (
          <div key={`${index}-${codeFrame.fileName}`} className="axonpack-net-codeframe">
            {codeFrame.fileName.length > 0 && (
              <div className="axonpack-net-codeframe-file">
                {formatFrameLocation(codeFrame.fileName)}
                {codeFrame.location
                  ? ` (${codeFrame.location.row}:${codeFrame.location.column})`
                  : ''}
              </div>
            )}
            {codeFrame.content.split('\n').map((line, lineIndex) => (
              <div
                key={`${lineIndex}-${line}`}
                data-marked={isMarkedCodeFrameLine(line) || undefined}>
                {line}
              </div>
            ))}
          </div>
        ))}
      </div>
    </details>
  );
}
