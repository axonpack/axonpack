import { createElement as h, useEffect, useMemo } from "react";
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
import { buildSlug } from "../../services/native/build-info.service";
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
import type { PreviewListLabels, PreviewListTheme } from "./preview-list.types";

export type PreviewListProps = {
  theme?: Partial<PreviewListTheme>;
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

  const renderItem = ({ item }: ListRenderItemInfo<ListItem>) => {
    switch (item.type) {
      case "dev-servers-header":
        return h(SectionHeader, {
          theme,
          title: labels.devPreviewServersTitle,
          hint: labels.devPreviewServersHint,
          error: item.error,
        });
      case "dev-server":
        return h(DevServerRow, {
          theme,
          labels,
          server: item.server,
          running: item.server.url === local.activeUrl,
          onSwitch: devPreviewServersStore.switchTo,
          onStop: () => devPreviewServersStore.switchTo(null),
        });
      case "hint":
        return h(HintRow, { theme, text: labels[item.hint], tone: item.tone });
      case "previews-header":
        return h(SectionHeader, { theme, title: labels.previewsTitle });
      case "preview":
        return h(PreviewRow, {
          theme,
          labels,
          item: item.item,
          onDownload: preview.download,
          onSwitch: preview.switchTo,
          onDelete: preview.remove,
        });
      case "incompatible-header":
        return h(SectionHeader, {
          theme,
          title: labels.incompatibleTitle,
          hint: labels.incompatibleHint,
          action: h(Button, {
            theme,
            title: labels.deleteAll,
            onPress: preview.removeIncompatible,
            kind: "danger",
          }),
        });
      case "incompatible":
        return h(IncompatibleRow, { theme, preview: item.preview });
    }
  };

  const header = h(
    View,
    { style: { gap: 12 } },
    h(HeroCard, {
      theme,
      labels,
      running: now,
      error: preview.error,
      loading: preview.loading,
      canGoBack: Boolean(preview.activeId || (showLocal && local.activeUrl)),
      onBackToBase: () => preview.switchTo(null),
      onRefresh: () => preview.refresh(),
    }),
  );

  return h(FlatList<ListItem>, {
    data: items,
    keyExtractor: keyOf,
    renderItem,
    ListHeaderComponent: header,
    refreshing: preview.loading,
    onRefresh: () => {
      preview.refresh();
      if (showLocal) devPreviewServersStore.refresh();
    },
    style: [{ backgroundColor: theme.background }, props.style],
    contentContainerStyle: { padding: 16, gap: 12 },
  });
}
