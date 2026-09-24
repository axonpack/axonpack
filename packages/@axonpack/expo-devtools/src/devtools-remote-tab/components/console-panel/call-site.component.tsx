import { useEffect, useState } from 'react';

import { symbolicateStack } from '../../../core/services/symbolicate-stack.service';
import { formatFrameLocation } from '../../../core/utils/frame-location.util';
import type { StackFrame } from '../../../core/utils/parse-stack.util';
import { primaryCallSite } from '../../../features/console/services/capture-call-site.service';

/**
 * Where a row came from, as `file:line`, named by the dev server the same way the app's row does it.
 * The raw frame shows until the answer comes, since an offset is at least honest about being all
 * there is.
 */
export function CallSite({ id, frames }: { id: string; frames: StackFrame[] }) {
  const [resolved, setResolved] = useState<StackFrame[] | null>(null);

  useEffect(() => {
    let active = true;
    symbolicateStack(id, frames).then((result) => {
      if (active && result) setResolved(result.frames);
    });
    return () => {
      active = false;
    };
  }, [id, frames]);

  const frame = primaryCallSite(resolved ?? frames);
  if (!frame) return null;

  const location = formatFrameLocation(frame.location);
  return <span title={location}>{location}</span>;
}
