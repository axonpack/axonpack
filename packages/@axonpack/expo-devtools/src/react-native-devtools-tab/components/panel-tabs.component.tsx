import { PANELS } from '../constants/panels.const';

/** One button per panel. `BAR_LAYOUT_CSS` is what lifts this row into the package's bar. */
export function PanelTabs({
  activeId,
  onSelect,
}: {
  activeId: string | undefined;
  onSelect: (id: string) => void;
}) {
  return (
    <div role="tablist" className="axonpack-panel-tabs">
      {PANELS.map((panel) => (
        <button
          key={panel.id}
          role="tab"
          aria-selected={panel.id === activeId}
          onClick={() => onSelect(panel.id)}>
          {panel.title}
        </button>
      ))}
    </div>
  );
}
