import { createElement as h, useEffect } from "react";
import {
  ScrollView,
  Text,
  useColorScheme,
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
import { font, resolveTheme } from "../../utils/preview-list/theme.util";
import { DevServersSection } from "./dev-servers-section.component";
import { HeroCard } from "./hero-card.component";
import { IncompatibleSection } from "./incompatible-section.component";
import { PreviewRow } from "./preview-row.component";
import type { PreviewListLabels, PreviewListTheme } from "./preview-list.types";

export type PreviewListProps = {
  theme?: Partial<PreviewListTheme>;
  labels?: Partial<PreviewListLabels>;
  style?: StyleProp<ViewStyle>;
};

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

  return h(
    ScrollView,
    {
      style: [{ backgroundColor: theme.background }, props.style],
      contentContainerStyle: { padding: 16, gap: 12 },
    },
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
    showLocal
      ? h(DevServersSection, {
          theme,
          labels,
          servers: local.servers,
          activeUrl: local.activeUrl,
          error: local.error,
          hasSlug: Boolean(appSlug),
          onSwitch: devPreviewServersStore.switchTo,
        })
      : null,
    ...preview.items.map((item) =>
      h(PreviewRow, {
        key: item.id,
        theme,
        labels,
        item,
        onDownload: preview.download,
        onSwitch: preview.switchTo,
        onDelete: preview.remove,
      }),
    ),
    !preview.loading && preview.items.length === 0
      ? h(
          Text,
          {
            style: {
              ...font(theme, "regular", 15),
              color: theme.muted,
              textAlign: "center",
              padding: 16,
            },
          },
          preview.buildKey ? labels.empty : labels.noBuildKey,
        )
      : null,
    preview.incompatible.length > 0
      ? h(IncompatibleSection, {
          theme,
          labels,
          previews: preview.incompatible,
          onDeleteAll: preview.removeIncompatible,
        })
      : null,
  );
}
