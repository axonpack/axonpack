import { useEffect, useMemo, useState } from "react";
import {
  FlatList,
  View,
  useColorScheme,
  type ListRenderItemInfo,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import {
  devPreviewServersStore,
  useDevPreviewServersState,
} from "../../stores/dev-preview-servers/dev-preview-servers.store";
import {
  buildApp,
  buildCompatibility,
  buildKey,
  buildSlug,
} from "../../services/native/build-info.service";
import { currentPlatform } from "../../utils/config/config.util";
import { usePreview } from "../../services/previews/use-preview.service";
import { useRunning } from "../../services/previews/use-running.service";
import { DEFAULT_LABELS } from "../../constants/preview-list/theme.const";
import { resolveTheme } from "../../utils/preview-list/theme.util";
import {
  type ListItem,
  buildListItems,
} from "../../utils/preview-list/list-items.util";
import { Button } from "./ui/button.ui";
import { SectionHeader } from "./ui/section-header.ui";
import { DevServerRow } from "./dev-server-row.component";
import { HeroCard } from "./hero-card.component";
import { HintRow } from "./hint-row.component";
import { IncompatibleRow } from "./incompatible-row.component";
import { PreviewRow } from "./preview-row.component";
import type {
  PreviewListLabels,
  PreviewListThemeInput,
} from "./preview-list.types";

export type PreviewListProps = {
  /**
   * Nothing for the built-in light or dark, a partial theme, or the palette the app passes
   * expo-devtools, so both look the same.
   */
  theme?: PreviewListThemeInput;
  labels?: Partial<PreviewListLabels>;
  style?: StyleProp<ViewStyle>;
};

const keyOf = (item: ListItem) => item.key;

/**
 * The previews published for this build, with what is running now, and the downloads made for
 * another build in a section of their own. Needs a `<PreviewProvider>` above it.
 */
export function PreviewList(props: PreviewListProps) {
  const preview = usePreview();
  const local = useDevPreviewServersState();
  const now = useRunning();
  const showLocal = __DEV__ && preview.devPreviewServers;
  // Without the slug the plugin bakes in, other apps' servers can't be told apart, so none are listed.
  const appSlug = buildSlug();
  // Look for servers only while the list is on screen.
  useEffect(
    () => (showLocal && appSlug ? devPreviewServersStore.watch() : undefined),
    [showLocal, appSlug],
  );
  const [pulling, setPulling] = useState(false);
  const theme = resolveTheme(props.theme, useColorScheme());
  const labels: PreviewListLabels = {
    ...DEFAULT_LABELS,
    ...props.labels,
    status: { ...DEFAULT_LABELS.status, ...props.labels?.status },
  };

  const items = useMemo(
    () =>
      buildListItems({
        showDevServers: showLocal,
        hasSlug: Boolean(appSlug),
        servers: local.servers,
        devServersError: local.error,
        loading: preview.loading,
        buildKey: preview.buildKey,
        items: preview.items,
        incompatible: preview.incompatible,
      }),
    [showLocal, appSlug, local, preview],
  );

  const deleteAll = (
    <Button
      theme={theme}
      title={labels.deleteAll}
      onPress={preview.removeIncompatible}
      kind="danger"
    />
  );

  const renderItem = ({ item }: ListRenderItemInfo<ListItem>) => {
    switch (item.type) {
      case "dev-servers-header":
        return (
          <SectionHeader
            theme={theme}
            title={labels.devPreviewServersTitle}
            hint={labels.devPreviewServersHint}
            error={item.error}
          />
        );
      case "dev-server":
        return (
          <DevServerRow
            theme={theme}
            labels={labels}
            server={item.server}
            running={item.server.url === local.activeUrl}
            onSwitch={devPreviewServersStore.switchTo}
            onStop={() => devPreviewServersStore.switchTo(null)}
          />
        );
      case "hint":
        return (
          <HintRow theme={theme} text={labels[item.hint]} tone={item.tone} />
        );
      case "previews-header":
        return <SectionHeader theme={theme} title={labels.previewsTitle} />;
      case "preview":
        return (
          <PreviewRow
            theme={theme}
            labels={labels}
            item={item.item}
            onDownload={preview.download}
            onSwitch={preview.switchTo}
            onDelete={preview.remove}
          />
        );
      case "incompatible-header":
        return (
          <SectionHeader
            theme={theme}
            title={labels.incompatibleTitle}
            hint={labels.incompatibleHint}
            action={deleteAll}
          />
        );
      case "incompatible":
        return <IncompatibleRow theme={theme} preview={item.preview} />;
    }
  };

  const runningEntry =
    now.kind === "preview"
      ? (preview.items.find((i) => i.id === now.id)?.entry ?? null)
      : null;
  const header = (
    <View style={{ gap: 12 }}>
      <HeroCard
        theme={theme}
        labels={labels}
        running={now}
        build={{
          app: buildApp(),
          platform: currentPlatform(),
          compatibility: buildCompatibility(),
          key: preview.buildKey ?? buildKey(),
        }}
        entry={runningEntry}
        error={preview.error}
        loading={preview.loading}
        // With only a server picked, Stop does the same, so one button is enough.
        canGoBack={Boolean(preview.activeId)}
        onBackToBase={() => preview.switchTo(null)}
        onStopServer={() => devPreviewServersStore.switchTo(null)}
        onRefresh={() => {
          preview.refresh();
          if (showLocal) devPreviewServersStore.refresh();
        }}
      />
    </View>
  );

  return (
    <FlatList<ListItem>
      data={items}
      keyExtractor={keyOf}
      renderItem={renderItem}
      ListHeaderComponent={header}
      // Only a pull shows the pull spinner. Tied to every load, iOS shifts the list down by the
      // spinner's height when the first load starts, and the top of the list is cut off.
      refreshing={pulling}
      onRefresh={() => {
        setPulling(true);
        Promise.all([
          preview.refresh(),
          showLocal ? devPreviewServersStore.refresh() : null,
        ]).finally(() => setPulling(false));
      }}
      style={[{ backgroundColor: theme.background }, props.style]}
      contentContainerStyle={{ padding: 16, gap: 12 }}
    />
  );
}
