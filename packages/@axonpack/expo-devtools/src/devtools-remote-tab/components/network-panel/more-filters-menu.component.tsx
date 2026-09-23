import { useMemo } from 'react';

import { Checkbox } from './checkbox.component';
import { SyncedInput } from './synced-input.component';
import {
  networkLogStore,
  useNetworkLogStore,
} from '../../../features/network/stores/network-log.store';
import {
  networkViewStore,
  useNetworkViewStore,
} from '../../../features/network/stores/network-view.store';
import {
  compileNetworkFilters,
  isUnreadable,
  type NetworkFilters,
} from '../../../features/network/utils/filter-entries.util';
import { formatSource } from '../../../features/network/utils/formatters.util';

type TextFilter = 'statusQuery' | 'minSize' | 'maxSize' | 'minDuration' | 'maxDuration';

const FIELDS: { key: TextFilter; label: string; placeholder: string }[] = [
  { key: 'statusQuery', label: 'Status', placeholder: '404, 4xx, >= 400, 200-299' },
  { key: 'minSize', label: 'Larger than', placeholder: '20kb' },
  { key: 'maxSize', label: 'Smaller than', placeholder: '2mb' },
  { key: 'minDuration', label: 'Slower than', placeholder: '500ms' },
  { key: 'maxDuration', label: 'Faster than', placeholder: '2s' },
];

const toggle = (list: readonly string[], value: string) =>
  list.includes(value) ? list.filter((item) => item !== value) : [...list, value];

/** Every filter the in-app panel has that Chrome's bar has no button for. */
export function MoreFiltersMenu({ onClose }: { onClose: () => void }) {
  const { filters } = useNetworkViewStore();
  const logs = useNetworkLogStore(networkLogStore.getMergedSnapshot);
  const compiled = useMemo(() => compileNetworkFilters(filters), [filters]);
  const methods = useMemo(() => [...new Set(logs.map((entry) => entry.method))], [logs]);
  const sources = useMemo(
    () => [...new Set(logs.flatMap((entry) => (entry.source ? [entry.source] : [])))],
    [logs]
  );
  const patch = networkViewStore.patchFilters;
  const flag = (key: keyof NetworkFilters, label: string) => (
    <Checkbox
      label={label}
      checked={filters[key] === true}
      onChange={(value) => patch({ [key]: value })}
    />
  );

  return (
    <>
      <div className="axonpack-panel-menu-backdrop" onClick={onClose} />
      <div className="axonpack-net-menu" role="menu">
        {flag('hideDataUrls', 'Hide data URLs')}
        {flag('hideFailed', 'Hide failed requests')}
        {flag('inFlightOnly', 'Only requests in flight')}
        {flag('interceptedOnly', 'Blocked or overridden requests')}
        <hr />
        {FIELDS.map((field) => (
          <label
            key={field.key}
            className="axonpack-net-field"
            data-invalid={
              isUnreadable(
                filters[field.key],
                compiled[field.key === 'statusQuery' ? 'status' : field.key]
              ) || undefined
            }>
            {field.label}
            <SyncedInput
              value={filters[field.key]}
              onChange={(value) => patch({ [field.key]: value })}
              placeholder={field.placeholder}
            />
          </label>
        ))}
        {methods.length > 0 && <div className="axonpack-net-menu-label">Methods</div>}
        {methods.map((method) => (
          <Checkbox
            key={method}
            label={method}
            checked={filters.methods.includes(method)}
            onChange={() => patch({ methods: toggle(filters.methods, method) })}
          />
        ))}
        {sources.length > 0 && <div className="axonpack-net-menu-label">Sources</div>}
        {sources.map((source) => (
          <Checkbox
            key={source}
            label={formatSource(source)}
            checked={filters.sources.includes(source)}
            onChange={() => patch({ sources: toggle(filters.sources, source) })}
          />
        ))}
      </div>
    </>
  );
}
