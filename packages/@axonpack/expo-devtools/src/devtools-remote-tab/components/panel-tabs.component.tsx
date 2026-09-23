import { useState } from 'react';

import { PanelTabMenu } from './panel-tab-menu.component';
import { PANELS } from '../constants/panels.const';
import { useTabOrder } from '../services/use-tab-order.service';

/**
 * How many strips a tab is cut into while a drag is on. The strip under the pointer is what the
 * dragged copy follows, so this is how finely it tracks the hand: a few pixels a strip.
 */
const DRAG_SPOTS = 24;

/**
 * One button per panel, then `»` for the ones that do not fit. `BAR_LAYOUT_CSS` is what lifts this
 * row into the package's bar, and what decides which tabs fit.
 *
 * Fitting is worked out in a hidden copy of the row, because only the page can measure: the other
 * tabs in order, then the active tab's label, so its width is reserved before anything else. The
 * seen row shows the active tab always, and each other tab only while its copy fits. So the active
 * tab keeps its place when everything before it fits, and sits last in view when it does not.
 */
export function PanelTabs({
  activeId,
  onSelect,
}: {
  activeId: string | undefined;
  onSelect: (id: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { ordered, draggingId, endDrag, tabProps } = useTabOrder(PANELS);
  const active = ordered.find((panel) => panel.id === activeId);
  const others = ordered.filter((panel) => panel !== active);
  const dragged = ordered.find((panel) => panel.id === draggingId);

  return (
    <div className="axonpack-panel-tabs">
      <div className="axonpack-panel-measure" aria-hidden>
        <div className="axonpack-panel-measure-row">
          {others.map((panel) => (
            <button
              key={panel.id}
              tabIndex={-1}
              data-id={panel.id}
              className="axonpack-panel-measure-tab">
              {panel.title}
            </button>
          ))}
          <span className="axonpack-panel-tab-spacer" />
        </div>
        {active && (
          <button tabIndex={-1} className="axonpack-panel-measure-tab">
            {active.title}
          </button>
        )}
      </div>
      <div
        role="tablist"
        className="axonpack-panel-tab-row"
        data-dragging={dragged ? true : undefined}
        onMouseLeave={endDrag}>
        {ordered.map((panel) => (
          <button
            key={panel.id}
            role="tab"
            data-id={panel.id}
            data-dragging={panel.id === draggingId || undefined}
            aria-selected={panel.id === activeId}
            className="axonpack-panel-tab"
            onClick={() => onSelect(panel.id)}
            {...tabProps(panel.id)}>
            {panel.title}
            {dragged && (
              <span className="axonpack-drag-spots">
                {Array.from({ length: DRAG_SPOTS }, (_, index) => (
                  <span key={index} className="axonpack-drag-spot" />
                ))}
              </span>
            )}
          </button>
        ))}
      </div>
      {/* Follows the pointer in the page, not through the app: the app is never told where the
          pointer is, only which element it entered. `BAR_LAYOUT_CSS` anchors this to the strip
          under the pointer. */}
      {dragged && <div className="axonpack-drag-ghost">{dragged.title}</div>}
      {/* Keyed by the tab it follows, so a change of that tab is a new button with a new animation.
          Picking the last tab changes it, and a running animation handed a different timeline was
          left showing the old answer, so » stayed hidden while a tab was missing. */}
      <button
        key={others.at(-1)?.id}
        className="axonpack-panel-more"
        data-last={others.at(-1)?.id}
        aria-label="More tabs"
        onClick={() => setMenuOpen((open) => !open)}
      />
      {menuOpen && (
        <PanelTabMenu
          panels={others}
          onSelect={(id) => {
            onSelect(id);
            setMenuOpen(false);
          }}
          onClose={() => setMenuOpen(false)}
        />
      )}
    </div>
  );
}
