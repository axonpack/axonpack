import { useState } from 'react';

import { formatFrameLocation } from '../../../../core/utils/frame-location.util';
import type { StackFrame } from '../../../../core/utils/parse-stack.util';

/**
 * One line per frame, scrolling sideways rather than wrapping, as in the app. Library frames wait
 * behind "See N more frames" unless every frame is one, and a click shows a frame's whole path.
 */
export function StackFrames({ frames }: { frames: StackFrame[] }) {
  const [showVendor, setShowVendor] = useState(false);
  const [revealed, setRevealed] = useState<number | null>(null);

  if (frames.length === 0) {
    return <p className="axonpack-net-none">No stack was recorded for this error</p>;
  }

  const rows = frames.map((frame, index) => ({ frame, index }));
  const appRows = rows.filter((row) => !row.frame.vendor);
  const collapsible = appRows.length > 0 && appRows.length < rows.length;
  const visible = collapsible && !showVendor ? appRows : rows;
  const hidden = rows.length - appRows.length;
  const noun = hidden === 1 ? 'frame' : 'frames';

  return (
    <>
      <div className="axonpack-crash-frames">
        <div className="axonpack-net-stack">
          {visible.map(({ frame, index }) => (
            <div
              key={`${index}-${frame.fn}-${frame.location}`}
              data-vendor={frame.vendor || undefined}
              title="Show the whole path"
              onClick={() => setRevealed(revealed === index ? null : index)}>
              <span>{index}</span>
              <span>{frame.fn}</span>
              <span>
                {revealed === index ? frame.location : formatFrameLocation(frame.location)}
              </span>
            </div>
          ))}
        </div>
      </div>
      {collapsible && (
        <button className="axonpack-crash-toggle" onClick={() => setShowVendor((show) => !show)}>
          {showVendor ? `Hide ${hidden} library ${noun}` : `See ${hidden} more ${noun}`}
        </button>
      )}
    </>
  );
}
