import { useEffect, useState } from 'react';

import { EntryTable } from './entry-table.component';
import { IdleState } from './idle-state.component';
import { performancePanelCss } from './performance-panel-css.const';
import { Resources } from './resources.component';
import { Startup } from './startup.component';
import { PerformanceToolbar } from './toolbar.component';
import { themeStore, useThemeStore } from '../../../core/stores/theme.store';
import type { PerformanceSection } from '../../../features/performance/components/section-chips.component';
import { startFpsMonitor } from '../../../features/performance/services/fps-monitor.service';
import {
  performanceStore,
  usePerformanceStore,
} from '../../../features/performance/stores/performance.store';
import { NETWORK_PANEL_CSS } from '../../constants/network-panel-css.const';

/**
 * The device's Performance tab over the same store, so recording, clearing and every reading move
 * together on both. Which section is open is this surface's own business.
 */
export function PerformancePanel() {
  const palette = useThemeStore(themeStore.getPalette);
  const { longTasks, userTiming, interactions, startup } = usePerformanceStore(
    performanceStore.getSnapshot
  );
  const paused = usePerformanceStore(performanceStore.isPaused);
  const [section, setSection] = useState<PerformanceSection>('statistics');

  // Joins the app's one frame counter, so the phone's tab open beside this one reads the same count.
  useEffect(() => {
    if (paused) return;
    return startFpsMonitor();
  }, [paused]);

  const neverRecorded =
    longTasks.length === 0 && interactions.length === 0 && userTiming.length === 0;

  return (
    <div className="axonpack-net axonpack-perf">
      {/* For the bar, its buttons and the section folds, which this panel shares with Network. */}
      <style>{NETWORK_PANEL_CSS}</style>
      <style>{performancePanelCss(palette)}</style>
      <PerformanceToolbar section={section} onSection={setSection} />
      <div className="axonpack-perf-body">
        {section === 'statistics' ? (
          <>
            {paused && neverRecorded ? <IdleState /> : <Resources />}
            <Startup startup={startup} />
          </>
        ) : (
          <EntryTable list={section} />
        )}
      </div>
    </div>
  );
}
