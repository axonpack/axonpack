import { COPY_ATTRIBUTE } from '@axonpack/react-native-devtools-tab';

import type { StorageEntry } from '../../../features/storage/stores/storage.store';
import { storageCopyTexts } from '../../../features/storage/utils/entry-menu-items.util';

/**
 * The app's menu for a key: a row's long press, and the ⋮ in its detail header. Opened here by a
 * right-click on a row, or by the ⋮ in the key pane.
 *
 * A copy carries its text for the page to put on this computer's clipboard. Delete is only offered
 * from the pane, where its confirm is drawn, as in the app.
 */
export function StorageEntryMenu({
  entry,
  onClose,
  align = 'left',
  onDelete,
}: {
  entry: StorageEntry;
  onClose: () => void;
  align?: 'left' | 'right';
  onDelete?: () => void;
}) {
  return (
    <div className="axonpack-net-context-anchor axonpack-net-row-menu" data-align={align}>
      <span className="axonpack-panel-menu-backdrop" onClick={onClose} />
      <span role="menu" className="axonpack-net-context">
        {storageCopyTexts(entry).map((item) => (
          <button
            key={item.label}
            role="menuitem"
            className="axonpack-net-context-item"
            {...{ [COPY_ATTRIBUTE]: item.text }}
            onClick={onClose}>
            {item.label}
          </button>
        ))}
        {onDelete && (
          <button
            role="menuitem"
            className="axonpack-net-context-item"
            onClick={() => {
              onDelete();
              onClose();
            }}>
            Delete key
          </button>
        )}
      </span>
    </div>
  );
}
