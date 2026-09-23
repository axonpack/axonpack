import { useEffect, useState } from 'react';
import { DevSettings } from 'react-native';

import { PanelTabs } from './panel-tabs.component';
import { BAR_LAYOUT_CSS } from '../constants/bar-layout.const';
import { PANELS } from '../constants/panels.const';

/**
 * Whether this JS session has mounted the tab before.
 *
 * The tab package's refresh button unmounts the tab behind its loader and mounts it again, and that is
 * the only thing that ever remounts it: a DevTools reload replays the tree instead. Its renderer is not
 * hooked into Fast Refresh, so that remount would draw the component functions from before your last
 * save. A second mount therefore means refresh was pressed, and it gets a full reload, the same as
 * pressing `r`, which is the one thing that does pick up new code. The flag resets with the reload.
 */
let mountedBefore = false;

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

  useEffect(() => {
    if (mountedBefore) DevSettings.reload('Axonpack tab refresh');
    mountedBefore = true;
  }, []);

  return (
    <>
      <style>{BAR_LAYOUT_CSS}</style>
      <PanelTabs activeId={activeId} onSelect={setActiveId} />
      <div className="axonpack-panel-body">{active && <active.component />}</div>
    </>
  );
}
