import type { NetworkLogEntry } from '../../../features/network/stores/network-log.store';
import { buildEntryCopyMenuItems } from '../../../features/network/utils/entry-menu-items.util';

/**
 * The app row's long-press menu, opened on a right-click and drawn under the row it was asked on.
 * The same items, from the same builder, less "Override response…", which has no editor here yet.
 *
 * The copies go through the app, as they do there, so they land on the device's clipboard. A
 * simulator shares that with the computer; a phone does not.
 */
export function RowMenu({ entry, onClose }: { entry: NetworkLogEntry; onClose: () => void }) {
  return (
    <div className="axonpack-net-context-anchor axonpack-net-row-menu">
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
