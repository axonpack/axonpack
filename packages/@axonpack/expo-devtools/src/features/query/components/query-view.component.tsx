import { useCallback, useEffect, useState } from 'react';
import { FlatList, Text, View } from 'react-native';

import { CacheDetailSheet, type CacheDetail } from './cache-detail-sheet.component';
import { CacheRow } from './cache-row.component';
import { QueryActions } from './query-actions.component';
import { DevtoolsToolbar } from '../../../core/components/devtools-toolbar.component';
import { Chip } from '../../../core/components/ui/chip.ui';
import { InsetPadding } from '../../../core/components/ui/inset-padding.ui';
import type { Palette } from '../../../core/constants/theme.const';
import { makeThemedStyles, useThemeColors } from '../../../core/utils/themed-styles.util';
import { queryStore, useQueryStore, type MutationRow, type QueryRow } from '../stores/query.store';
import {
  formatClockTime,
  formatKey,
  queryStatusLabel,
  statusColor,
} from '../utils/format-query.util';

type Section = 'queries' | 'mutations';

function queryDetail(row: QueryRow): CacheDetail {
  return {
    title: row.hash,
    actions: <QueryActions row={row} />,
    info: [
      ['Status', row.status],
      ['Fetch status', row.fetchStatus],
      ['Observers', String(row.observers)],
      ['Stale', row.stale ? 'yes' : 'no'],
      ['Last updated', formatClockTime(row.updatedAt)],
      ...(row.forced ? [['Forced', row.forced] as [string, string]] : []),
    ],
    values: [
      ...(row.error ? [{ label: 'Error', value: row.error, isError: true }] : []),
      { label: 'Data', value: row.data },
    ],
  };
}

function mutationDetail(row: MutationRow): CacheDetail {
  return {
    title: formatKey(row.key, `Mutation #${row.id}`),
    info: [
      ['Status', row.status],
      ['Submitted', formatClockTime(row.submittedAt)],
    ],
    values: [
      ...(row.error ? [{ label: 'Error', value: row.error, isError: true }] : []),
      { label: 'Variables', value: row.variables },
      { label: 'Data', value: row.data },
    ],
  };
}

function plural(count: number, word: string) {
  return `${count} ${word}${count === 1 ? '' : 's'}`;
}

function renderQueryRow(row: QueryRow, COLORS: Palette, onPress: (id: string) => void) {
  const label = row.forced ? `forced ${row.forced}` : queryStatusLabel(row);
  return (
    <CacheRow
      id={row.hash}
      title={row.hash}
      status={label}
      statusColor={statusColor(COLORS, row.forced ?? queryStatusLabel(row))}
      detail={`${plural(row.observers, 'observer')} · updated ${formatClockTime(row.updatedAt)}`}
      onPress={onPress}
    />
  );
}

export function QueryView() {
  const styles = useStyles();
  const COLORS = useThemeColors();
  const queries = useQueryStore(queryStore.getQueries);
  const mutations = useQueryStore(queryStore.getMutations);
  const [section, setSection] = useState<Section>('queries');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => queryStore.watch(), []);

  const select = useCallback((id: string) => setSelectedId(id), []);

  function switchTo(next: Section) {
    setSection(next);
    setSelectedId(null);
  }

  // Looked up by id on every render rather than held, so the sheet follows the query live and a
  // removed one closes it.
  let detail: CacheDetail | null = null;
  if (selectedId !== null && section === 'queries') {
    const row = queries.find((current) => current.hash === selectedId);
    if (row) detail = queryDetail(row);
  } else if (selectedId !== null) {
    const row = mutations.find((current) => String(current.id) === selectedId);
    if (row) detail = mutationDetail(row);
  }

  return (
    <View style={styles.container}>
      {/* No clear button: in every other tab it drops a log, and here it would wipe the app's cache. */}
      <DevtoolsToolbar>
        <View style={styles.sections}>
          <Chip
            label={`Queries ${queries.length}`}
            active={section === 'queries'}
            onPress={() => switchTo('queries')}
          />
          <Chip
            label={`Mutations ${mutations.length}`}
            active={section === 'mutations'}
            onPress={() => switchTo('mutations')}
          />
        </View>
      </DevtoolsToolbar>

      {section === 'queries' ? (
        <FlatList
          data={queries}
          keyExtractor={(row) => row.hash}
          renderItem={({ item }) => renderQueryRow(item, COLORS, select)}
          style={styles.list}
          ListEmptyComponent={<Text style={styles.empty}>No queries in the cache yet.</Text>}
          ListFooterComponent=<InsetPadding edge="bottom" />
        />
      ) : (
        <FlatList
          data={mutations}
          keyExtractor={(row) => String(row.id)}
          renderItem={({ item }) => (
            <CacheRow
              id={String(item.id)}
              title={formatKey(item.key, `Mutation #${item.id}`)}
              status={item.status}
              statusColor={statusColor(COLORS, item.status)}
              detail={`submitted ${formatClockTime(item.submittedAt)}`}
              onPress={select}
            />
          )}
          style={styles.list}
          ListEmptyComponent={<Text style={styles.empty}>No mutations yet.</Text>}
          ListFooterComponent=<InsetPadding edge="bottom" />
        />
      )}

      <CacheDetailSheet detail={detail} onClose={() => setSelectedId(null)} />
    </View>
  );
}

const useStyles = makeThemedStyles((COLORS) => ({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  sections: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 6,
  },
  list: {
    flex: 1,
  },
  empty: {
    textAlign: 'center',
    color: COLORS.textSecondary,
    marginTop: 40,
  },
}));
