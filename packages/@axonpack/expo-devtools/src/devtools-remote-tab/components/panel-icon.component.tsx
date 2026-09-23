import { PANEL_ICONS } from '../constants/panel-icons.const';

/** The in-app tab's icon before a panel's name. A panel with none, like a plugin's, gets nothing. */
export function PanelIcon({ id }: { id: string }) {
  return PANEL_ICONS[id] ? <span className="axonpack-panel-icon" data-id={id} /> : null;
}
