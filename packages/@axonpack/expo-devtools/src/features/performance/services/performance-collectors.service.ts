import { observeEventTiming } from './observe-event-timing.service';
import { observeLongTasks } from './observe-long-tasks.service';
import { readStartupTiming } from './read-startup-timing.service';
import { startMemorySampling } from './sample-memory.service';
import { startSystemMetricsSampling } from './sample-system-metrics.service';
import { performanceStore } from '../stores/performance.store';

export type CollectorOptions = {
  sampleIntervalMs: number;
  longTaskThresholdMs: number;
  interactionThresholdMs: number;
};

let stopFunctions: (() => void)[] = [];

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
