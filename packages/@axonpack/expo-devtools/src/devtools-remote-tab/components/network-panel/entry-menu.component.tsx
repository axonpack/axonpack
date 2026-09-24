import { COPY_ATTRIBUTE } from '@axonpack/react-native-devtools-tab';

import type { RequestPane } from './request-detail';
import type { NetworkLogEntry } from '../../../features/network/stores/network-log.store';
import {
  entryCopyTexts,
  entryRuleMenuItems,
} from '../../../features/network/utils/entry-menu-items.util';
import {
  responseBodyDataUrl,
  responseFileName,
} from '../../../features/network/utils/share-response-body.util';

/**
 * The app's menu for a request: its row's long press, and the ⋮ in its detail header. Opened here by
 * a right-click on a row, drawn under it, or by the ⋮ in the request pane, drawn under that.
 *
 * The copies and the save happen in this browser, not in the app. A copy carries its text for the
 * page to put on this computer's clipboard, and the app's Share becomes a download. Block and
 * override act on the app, so those are the app's own items, called from here.
 */
export function EntryMenu({
  entry,
  onClose,
  align = 'left',
  onOpen,
}: {
  entry: NetworkLogEntry;
  onClose: () => void;
  /** Which edge of what opened it the menu lines up with. */
  align?: 'left' | 'right';
  /** Opens this request's pane on one of the editors. */
  onOpen: (pane: Exclude<RequestPane, 'detail'>) => void;
}) {
  const body = responseBodyDataUrl(entry);

  return (
    <div className="axonpack-net-context-anchor axonpack-net-row-menu" data-align={align}>
      <span className="axonpack-panel-menu-backdrop" onClick={onClose} />
      <span role="menu" className="axonpack-net-context">
        <button
          role="menuitem"
          className="axonpack-net-context-item"
          onClick={() => {
            onOpen('sandbox');
            onClose();
          }}>
          <span className="axonpack-material axonpack-sparkle" data-material="auto-awesome" />
          Try in sandbox
        </button>
        {entryCopyTexts(entry).map((item) => (
          <button
            key={item.label}
            role="menuitem"
            className="axonpack-net-context-item"
            {...{ [COPY_ATTRIBUTE]: item.text }}
            onClick={onClose}>
            {item.label}
          </button>
        ))}
        {body && (
          <a
            role="menuitem"
            className="axonpack-net-context-item"
            href={body}
            download={responseFileName(entry)}
            onClick={onClose}>
            Save response body
          </a>
        )}
        {entryRuleMenuItems(entry, () => onOpen('override')).map((item) => (
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
