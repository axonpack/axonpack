import { replayNitroEntries } from './nitro-fetch.service';
import { networkLogStore } from '../stores/network-log.store';

export function setNetworkPaused(paused: boolean) {
  networkLogStore.setPaused(paused);
  // A JSI client kept recording while this was paused, and nothing here was listening. Reading its
  // buffer on resume is what makes the record button mean the same thing for that traffic as it does
  // for everything else.
  if (!paused) replayNitroEntries();
}
