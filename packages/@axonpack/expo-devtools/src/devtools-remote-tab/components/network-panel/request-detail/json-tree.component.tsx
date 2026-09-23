import { JsonTree as PrettyJsonTree, type MenuItem } from '@axonpack/react-pretty-print';
import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';

import { MenuSlot, TAB_PRIMITIVES } from './tab-primitives.component';
import { themeStore, useThemeStore } from '../../../../core/stores/theme.store';
import type { JsonValue } from '../../../../core/utils/json-tree.util';
import { prettyPrintTheme } from '../../../utils/pretty-print-theme.util';

/**
 * `@axonpack/react-pretty-print`'s tree in the app's colours, with the menu the app opens on a long
 * press opened on a right-click instead.
 *
 * Copy goes through the app, as it does in the app, so it lands on the device's clipboard. A
 * simulator shares that with the computer; a phone does not.
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
          onCopy={Clipboard.setStringAsync}
          onRequestMenu={setItems}
        />
      </div>
    </MenuSlot.Provider>
  );
}
