import { StyleSheet, View } from 'react-native';

import { SortSelector } from './sort-selector.component';
import { ThrottleSelector } from './throttle-selector.component';
import { UserAgentSelector } from './user-agent-selector.component';
import { SettingRow } from '../../../core/components/ui/setting-row.ui';
import { makeThemedStyles } from '../../../core/utils/themed-styles.util';
import type { NetworkSort } from '../utils/sort-entries.util';

/**
 * How the list behaves, as opposed to which rows are in it. No scroll view of its own: it scrolls with
 * the rows as the list's header, and a second vertical scroller inside one is a fight over every drag.
 */
export function SettingsPanel({
  bigRows,
  onChangeBigRows,
  groupByFetchClient,
  onChangeGroupByFetchClient,
  showOverview,
  onChangeShowOverview,
  stackedHeaders,
  onChangeStackedHeaders,
  sort,
  onChangeSort,
}: {
  bigRows: boolean;
  onChangeBigRows: (next: boolean) => void;
  groupByFetchClient: boolean;
  onChangeGroupByFetchClient: (next: boolean) => void;
  showOverview: boolean;
  onChangeShowOverview: (next: boolean) => void;
  stackedHeaders: boolean;
  onChangeStackedHeaders: (next: boolean) => void;
  sort: NetworkSort;
  onChangeSort: (next: NetworkSort) => void;
}) {
  const styles = useStyles();

  return (
    <View style={styles.panel}>
      <SettingRow label="Large request rows" value={bigRows} onValueChange={onChangeBigRows} />
      <SettingRow
        label="Group by fetch client"
        value={groupByFetchClient}
        onValueChange={onChangeGroupByFetchClient}
      />
      <SettingRow label="Show overview" value={showOverview} onValueChange={onChangeShowOverview} />
      <SettingRow
        label="Stack header values"
        value={stackedHeaders}
        onValueChange={onChangeStackedHeaders}
      />
      <SortSelector sort={sort} onChange={onChangeSort} />
      <ThrottleSelector />
      <UserAgentSelector />
    </View>
  );
}

const useStyles = makeThemedStyles((COLORS) => ({
  panel: {
    padding: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
}));
