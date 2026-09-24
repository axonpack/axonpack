import { useState } from 'react';
import { DevSettings } from 'react-native';

import { PanelTabs } from './panel-tabs.component';
import { ThemeSwitcher } from './theme-switcher.component';
import { themeStore, useThemeStore } from '../../core/stores/theme.store';
import { BAR_LAYOUT_CSS } from '../constants/bar-layout.const';
import { PANELS } from '../constants/panels.const';
import { themeCss } from '../utils/theme-css.util';

/**
 * The one Axonpack tab in React Native DevTools, with its panel buttons inside the package's bar.
 *
 * Only the active panel is mounted. The DevTools tab itself is mounted once and never let go, so a
 * panel left mounted behind the bar would keep its store subscriptions and effects running, and keep
 * sending its tree to the frontend, for as long as the app lives. Switching away drops it instead,
 * which does mean a panel's filters and scroll are gone when you come back.
 */
export function AxonpackTab() {
  const [activeId, setActiveId] = useState(PANELS[0]?.id);
  const active = PANELS.find((panel) => panel.id === activeId);
  const palette = useThemeStore(themeStore.getPalette);

  return (
    <>
      <style>{BAR_LAYOUT_CSS}</style>
      <style>{themeCss(palette)}</style>
      <PanelTabs activeId={activeId} onSelect={setActiveId} />
      <ThemeSwitcher />
      <button
        className="axonpack-reload"
        title="Reload the app"
        onClick={() => DevSettings.reload('Axonpack tab reload')}>
        Reload
      </button>
      <div className="axonpack-panel-body">{active && <active.component />}</div>
    </>
  );
}
