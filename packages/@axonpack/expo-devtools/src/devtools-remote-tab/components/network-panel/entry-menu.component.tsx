import type { NetworkLogEntry } from '../../../features/network/stores/network-log.store';
import { buildEntryCopyMenuItems } from '../../../features/network/utils/entry-menu-items.util';

/**
 * The app's menu for a request, from the same builder: its row's long press, and the ⋮ in its detail
 * header. Opened here by a right-click on a row, drawn under it, or by the ⋮ in the request pane,
 * drawn under that. Less "Override response…" and "Try in sandbox", which have no editor here yet.
 *
 * The copies go through the app, as they do there, so they land on the device's clipboard. A
 * simulator shares that with the computer; a phone does not.
 */
export function EntryMenu({
  entry,
  onClose,
  align = 'left',
}: {
  entry: NetworkLogEntry;
  onClose: () => void;
  /** Which edge of what opened it the menu lines up with. */
  align?: 'left' | 'right';
}) {
  return (
    <div className="axonpack-net-context-anchor axonpack-net-row-menu" data-align={align}>
      <span className="axonpack-panel-menu-backdrop" onClick={onClose} />
      <span role="menu" className="axonpack-net-context">
        {buildEntryCopyMenuItems(entry).map((item) => (
          <button
            key={item.label}
            role="menuitem"
            className="axonpack-net-context-item"
            onClick={() => {
              item.onPress();
              onClose();
            }}>
            {item.label}
          </button>
        ))}
      </span>
    </div>
  );
}
