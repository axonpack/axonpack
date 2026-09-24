import type { MaterialIcon } from '../constants/material-icons.const';

/** The in-app tab's icon before a panel's name. A panel with none, like a plugin's, gets nothing. */
export function PanelIcon({ icon }: { icon?: MaterialIcon }) {
  return icon ? (
    <span className="axonpack-material axonpack-panel-icon" data-material={icon} />
  ) : null;
}
