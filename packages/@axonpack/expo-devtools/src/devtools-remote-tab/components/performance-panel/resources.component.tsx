import { FpsCard } from './fps-card.component';
import { InteractionCard } from './interaction-card.component';
import { MemoryCard } from './memory-card.component';
import { StorageCard } from './storage-card.component';

export function Resources() {
  return (
    <details open className="axonpack-net-section">
      <summary>Resources</summary>
      <div className="axonpack-perf-grid">
        <FpsCard />
        <InteractionCard />
        <MemoryCard />
        <StorageCard />
      </div>
    </details>
  );
}
