import type { AxonpackPanel } from '../constants/panels.const';

/**
 * The list behind `»`: every tab but the active one, which is always in the bar. `BAR_LAYOUT_CSS`
 * hides the ones that already fit, because only the page knows what fits.
 */
export function PanelTabMenu({
  panels,
  onSelect,
  onClose,
}: {
  panels: AxonpackPanel[];
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <>
      <div className="axonpack-panel-menu-backdrop" onClick={onClose} />
      <div role="menu" className="axonpack-panel-menu" data-last={panels.at(-1)?.id}>
        {panels.map((panel) => (
          <button
            key={panel.id}
            role="menuitem"
            data-id={panel.id}
            className="axonpack-panel-menu-item"
            onClick={() => onSelect(panel.id)}>
            {panel.title}
          </button>
        ))}
      </div>
    </>
  );
}
