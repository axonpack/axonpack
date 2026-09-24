import {
  storageViewStore,
  useStorageViewStore,
} from '../../../features/storage/stores/storage-view.store';
import { Checkbox } from '../network-panel/checkbox.component';

/** The app's "More filters" switches. */
export function MoreFiltersMenu({ onClose }: { onClose: () => void }) {
  const { filters, groupByNamespace } = useStorageViewStore();
  const patch = storageViewStore.patchFilters;

  return (
    <>
      <div className="axonpack-panel-menu-backdrop" onClick={onClose} />
      <div className="axonpack-net-menu" role="menu">
        <Checkbox
          label="Group by namespace"
          checked={groupByNamespace}
          onChange={storageViewStore.setGroupByNamespace}
        />
        <Checkbox
          label="Hide empty values"
          checked={filters.hideEmpty}
          onChange={(hideEmpty) => patch({ hideEmpty })}
        />
        <Checkbox
          label="JSON values only"
          checked={filters.jsonOnly}
          onChange={(jsonOnly) => patch({ jsonOnly })}
        />
      </div>
    </>
  );
}
