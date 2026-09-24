import { useState } from 'react';

import { themeStore, useThemeStore } from '../../core/stores/theme.store';
import { themeLabel } from '../../core/utils/theme-label.util';

/**
 * The palette button before Reload, and the list of themes under it. It sets the app's own theme, so
 * the in-app panel changes with it and a theme picked there shows here.
 */
export function ThemeSwitcher() {
  const [open, setOpen] = useState(false);
  const activeId = useThemeStore(themeStore.getActiveId);
  const themes = useThemeStore((state) => state.themes);

  return (
    <div className="axonpack-theme">
      <button
        className="axonpack-theme-button"
        title="Theme"
        aria-label="Theme"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      />
      {open && (
        <>
          <div className="axonpack-panel-menu-backdrop" onClick={() => setOpen(false)} />
          <div role="menu" className="axonpack-theme-menu">
            {[...themes.keys()].map((id) => (
              <button
                key={id}
                role="menuitemradio"
                aria-checked={id === activeId}
                className="axonpack-theme-item"
                onClick={() => {
                  themeStore.setActiveId(id);
                  setOpen(false);
                }}>
                {themeLabel(id)}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
