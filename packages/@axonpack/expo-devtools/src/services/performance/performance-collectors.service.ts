import { observeEventTiming } from './observe-event-timing.service';
import { observeLongTasks } from './observe-long-tasks.service';
import { readStartupTiming } from './read-startup-timing.service';
import { startMemorySampling } from './sample-memory.service';
import { startSystemMetricsSampling } from './sample-system-metrics.service';
import { performanceStore } from '../../stores/performance/performance.store';

export type CollectorOptions = {
  sampleIntervalMs: number;
  longTaskThresholdMs: number;
  interactionThresholdMs: number;
};

let stopFunctions: (() => void)[] = [];
// Guards re-entrancy: the collectors report their support as they attach, which publishes a store
// change, which calls the listener below again while `stopFunctions` is still being built.
let running = false;

function start(options: CollectorOptions) {
  if (running) return;
  running = true;
  stopFunctions = [
    startMemorySampling(options.sampleIntervalMs),
    startSystemMetricsSampling(options.sampleIntervalMs),
    observeLongTasks(options.longTaskThresholdMs),
    observeEventTiming(options.interactionThresholdMs),
  ];
}

function stop() {
  if (!running) return;
  running = false;
  for (const stopFunction of stopFunctions) stopFunction();
  stopFunctions = [];
}

/**
 * Attaches and detaches every collector in step with the record button, instead of leaving them
 * attached and filtering in the store.
 *
 * This is deliberate, and it fixes a real bug: an observer registered while recording was paused
 * delivered nothing once recording resumed, so `disabledByDefault: true` produced a permanently
 * empty list while starting unpaused worked. Binding the lifecycle to the toggle means pressing
 * record attaches a fresh observer, which also re-reads the buffered native entries. It costs
 * nothing while paused, which is a better outcome than sampling and discarding.
 *
 * Startup timing is exempt — it is a one-shot read of markers that never change, so it happens
 * whether or not recording is on.
 */
export function startPerformanceCollectors(options: CollectorOptions) {
  readStartupTiming();

  const sync = () => {
    if (performanceStore.isPaused()) stop();
    else start(options);
  };

  const unsubscribe = performanceStore.subscribe(sync);
  sync();

  return () => {
    unsubscribe();
    stop();
  };
}
