import { COPY_ATTRIBUTE } from '@axonpack/react-native-devtools-tab';
import { JsonTree as PrettyJsonTree, type MenuItem } from '@axonpack/react-pretty-print';
import { useState } from 'react';

import { MenuSlot, TAB_PRIMITIVES } from './tab-primitives.component';
import { themeStore, useThemeStore } from '../../../../core/stores/theme.store';
import type { JsonValue } from '../../../../core/utils/json-tree.util';
import { prettyPrintTheme } from '../../../utils/pretty-print-theme.util';

/**
 * `@axonpack/react-pretty-print`'s tree in the app's colours, with the menu the app opens on a long
 * press opened on a right-click instead.
 *
 * A copy item carries its text, and the browser copies it, so it lands on this computer's clipboard
 * rather than the device's. Its `onSelect` still runs, and copies nothing here.
 */
export function JsonTree({ value }: { value: JsonValue }) {
  const palette = useThemeStore(themeStore.getPalette);
  const [openId, setOpenId] = useState<string | null>(null);
  const [items, setItems] = useState<MenuItem[]>([]);
  const close = () => setOpenId(null);

  const menu = (
    <>
      <span className="axonpack-panel-menu-backdrop" onClick={close} />
      <span role="menu" className="axonpack-net-context">
        {items.map((item) => (
          <button
            key={item.label}
            role="menuitem"
            className="axonpack-net-context-item"
            {...(item.copyText !== undefined && { [COPY_ATTRIBUTE]: item.copyText })}
            onClick={() => {
              item.onSelect();
              close();
            }}>
            {item.label}
          </button>
        ))}
      </span>
    </>
  );

  return (
    <MenuSlot.Provider value={{ openId, open: setOpenId, menu }}>
      <div className="axonpack-json">
        <PrettyJsonTree
          primitives={TAB_PRIMITIVES}
          value={value}
          theme={prettyPrintTheme(palette)}
          // Offered so the tree lists its copy items; the copying itself is the browser's.
          onCopy={() => {}}
          onRequestMenu={setItems}
        />
      </div>
    </MenuSlot.Provider>
  );
}
