import { StackOrigin } from '../../../../core/components/stack-origin.component';
import type { NetworkLogEntry } from '../../stores/network-log.store';

export function InitiatorTab({ entry }: { entry: NetworkLogEntry }) {
  return (
    <StackOrigin
      id={entry.id}
      frames={entry.initiator ?? []}
      emptyText="No call stack was captured for this request."
    />
  );
}
