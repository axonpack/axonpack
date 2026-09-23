import { useRef, useState } from 'react';

import type { AxonpackPanel } from '../constants/panels.const';

/**
 * How long a press has to be held on one tab before it picks the tab up, so a plain click, or a press
 * that slides off, still just selects.
 */
const HOLD_MS = 200;

/**
 * The tab order, and press-and-hold to change it.
 *
 * Mouse events rather than HTML drag and drop. A drop only fires if `dragover` called
 * `preventDefault`, and it has to be called there and then, in the browser. These handlers run in
 * the app, after the event has crossed, so that call would always be too late.
 */
export function useTabOrder(panels: AxonpackPanel[]) {
  const [order, setOrder] = useState(() => panels.map((panel) => panel.id));
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const hold = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragging = useRef<string | null>(null);
  // A move can leave the pointer over the tab it just swapped with, when the two are not the same
  // width. Without this the next event swaps them straight back, and they flicker.
  const lastSwapped = useRef<string | null>(null);

  const endDrag = () => {
    if (hold.current) clearTimeout(hold.current);
    hold.current = null;
    dragging.current = null;
    lastSwapped.current = null;
    setDraggingId(null);
  };

  const tabProps = (id: string) => ({
    onMouseDown: () => {
      hold.current = setTimeout(() => {
        hold.current = null;
        dragging.current = id;
        setDraggingId(id);
      }, HOLD_MS);
    },
    onMouseUp: endDrag,
    // Leaving the tab before the hold is up means it was not a long press, so it never becomes a drag.
    onMouseLeave: () => {
      if (!hold.current) return;
      clearTimeout(hold.current);
      hold.current = null;
    },
    onMouseEnter: () => {
      const from = dragging.current;
      if (!from) return;
      if (id === from) {
        lastSwapped.current = null;
        return;
      }
      if (id === lastSwapped.current) return;
      lastSwapped.current = id;

      setOrder((current) => {
        const next = current.filter((other) => other !== from);
        next.splice(current.indexOf(id), 0, from);
        return next;
      });
    },
  });

  return {
    ordered: order.flatMap((id) => panels.find((panel) => panel.id === id) ?? []),
    draggingId,
    endDrag,
    tabProps,
  };
}
