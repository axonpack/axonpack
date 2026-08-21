import { useEffect, useState } from 'react';
import { Text } from 'react-native';

import { symbolicateStack } from '../../../core/services/symbolicate-stack.service';
import { formatFrameLocation } from '../../../core/utils/frame-location.util';
import { makeThemedStyles } from '../../../core/utils/themed-styles.util';
import type { StackFrame } from '../../../core/utils/parse-stack.util';
import { primaryCallSite } from '../services/capture-call-site.service';

/**
 * Where a row came from, as `file:line`.
 *
 * A development bundle names the bundle and not the file, so the frames have to go to Metro before
 * they read as anything — which is a request, so it happens here, per row, once the row is on screen.
 * The service caches per id and collapses duplicate calls, and a list only renders what is visible,
 * so scrolling does not ask twice for the same row.
 *
 * Until it answers, and in a release build where nothing does, the raw frame is shown instead of
 * nothing: an offset into the bundle is little use, but it is honest about being all there is.
 */
export function CallSite({ id, frames }: { id: string; frames: StackFrame[] }) {
  const styles = useStyles();
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

  return (
    <Text style={styles.location} numberOfLines={1} selectable>
      {formatFrameLocation(frame.location)}
    </Text>
  );
}

const useStyles = makeThemedStyles((COLORS) => ({
  location: {
    fontSize: 10,
    color: COLORS.textSecondary,
  },
}));
