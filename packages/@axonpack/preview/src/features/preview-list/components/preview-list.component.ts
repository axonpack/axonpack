import { createElement as h, type ReactNode, useEffect } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
  useColorScheme,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import type { DevPreviewServer } from "../../dev-preview-servers/utils/merge-servers.util";
import {
  devPreviewServersStore,
  useDevPreviewServersState,
} from "../../dev-preview-servers/stores/dev-preview-servers.store";
import type {
  PreviewItem,
  PreviewStatus,
} from "../../previews/utils/preview-items.util";
import { buildSlug } from "../../../core/services/build-info.service";
import { usePreview } from "../../../core/components/preview-provider.component";
import { useRunning } from "../../previews/services/use-running.service";
import {
  DEFAULT_LABELS,
  formatSize,
  resolveTheme,
} from "../constants/theme.const";
import type { PreviewListLabels, PreviewListTheme } from "../types";

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
  const labels = {
    ...DEFAULT_LABELS,
    ...props.labels,
    status: { ...DEFAULT_LABELS.status, ...props.labels?.status },
  };
  const { radius, fonts } = theme;

  // A custom font family replaces the weight, since most families ship one file per weight.
  const font = (weight: "regular" | "medium" | "bold", size: number) => {
    const family = fonts[weight];
    return {
      fontSize: size,
      ...(family
        ? { fontFamily: family }
        : {
            fontWeight: (weight === "bold"
              ? "700"
              : weight === "medium"
                ? "600"
                : "400") as "700" | "600" | "400",
          }),
    };
  };

  const button = (
    title: string,
    onPress: () => void,
    kind: "primary" | "plain" | "danger" = "primary",
  ): ReactNode =>
    h(
      Pressable,
      {
        key: title,
        onPress,
        accessibilityRole: "button",
        style: ({ pressed }: { pressed: boolean }): ViewStyle => ({
          minHeight: 44,
          paddingHorizontal: 16,
          justifyContent: "center",
          borderRadius: radius / 1.5,
          opacity: pressed ? 0.7 : 1,
          backgroundColor: kind === "primary" ? theme.primary : "transparent",
          borderWidth: kind === "primary" ? 0 : 1,
          borderColor: kind === "danger" ? theme.danger : theme.border,
        }),
      },
      h(
        Text,
        {
          style: {
            ...font("medium", 15),
            color:
              kind === "primary"
                ? theme.primaryText
                : kind === "danger"
                  ? theme.danger
                  : theme.text,
          },
        },
        title,
      ),
    );

  const statusColor = (status: PreviewStatus) =>
    status === "broken"
      ? theme.danger
      : status === "update-available" || status === "unpublished"
        ? theme.warning
        : status === "downloaded"
          ? theme.success
          : theme.muted;

  const card = (key: string, children: ReactNode[]) =>
    h(
      View,
      {
        key,
        style: {
          backgroundColor: theme.card,
          borderRadius: radius,
          borderWidth: 1,
          borderColor: theme.border,
          padding: 16,
          gap: 10,
        },
      },
      ...children,
    );

  const row = (item: PreviewItem) => {
    const { entry } = item;
    const date = entry.publishedAt
      ? new Date(entry.publishedAt).toLocaleString()
      : "";
    const meta = [
      entry.appVersion ? `v${entry.appVersion}` : "",
      entry.branch,
      entry.author,
      date,
      formatSize(entry.size),
    ]
      .filter(Boolean)
      .join(" · ");
    const actions: ReactNode[] = [];
    if (item.status === "available")
      actions.push(
        button(labels.download, () => preview.download(item.id), "plain"),
      );
    if (item.status === "update-available")
      actions.push(
        button(labels.update, () => preview.download(item.id), "plain"),
      );
    if (!item.active && item.status !== "downloading") {
      actions.push(button(labels.switchTo, () => preview.switchTo(item.id)));
    }
    if (item.local && item.status !== "downloading") {
      actions.push(
        button(labels.delete, () => preview.remove(item.id), "danger"),
      );
    }
    return card(
      item.id,
      [
        h(
          View,
          {
            key: "head",
            style: {
              flexDirection: "row",
              justifyContent: "space-between",
              gap: 8,
            },
          },
          h(
            Text,
            {
              style: { ...font("bold", 17), color: theme.title, flexShrink: 1 },
            },
            entry.title,
          ),
          h(
            Text,
            {
              style: {
                ...font("medium", 13),
                color: item.active ? theme.success : statusColor(item.status),
              },
            },
            item.active ? labels.running : labels.status[item.status],
          ),
        ),
        h(
          Text,
          {
            key: "meta",
            style: { ...font("regular", 13), color: theme.muted },
          },
          meta,
        ),
        entry.changelog
          ? h(
              Text,
              {
                key: "changelog",
                style: {
                  ...font("regular", 14),
                  color: theme.text,
                  backgroundColor: theme.surface,
                  borderRadius: radius / 2,
                  padding: 10,
                },
              },
              entry.changelog,
            )
          : null,
        item.progress !== null
          ? h(
              View,
              {
                key: "progress",
                accessibilityRole: "progressbar",
                accessibilityValue: {
                  min: 0,
                  max: 100,
                  now: Math.round(item.progress * 100),
                },
                style: {
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: theme.surface,
                  overflow: "hidden",
                },
              },
              h(View, {
                style: {
                  width: `${Math.round(item.progress * 100)}%`,
                  height: 6,
                  backgroundColor: theme.primary,
                },
              }),
            )
          : null,
        actions.length > 0
          ? h(
              View,
              {
                key: "actions",
                style: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
              },
              ...actions,
            )
          : null,
      ].filter(Boolean) as ReactNode[],
    );
  };

  const localRow = (server: DevPreviewServer) => {
    const running = server.url === local.activeUrl;
    const meta = [
      server.branch,
      server.hostPort,
      server.version ? `v${server.version}` : "",
    ]
      .filter(Boolean)
      .join(" · ");
    const badge =
      server.compatible === false
        ? { text: labels.localIncompatible, color: theme.warning }
        : server.compatible === null
          ? { text: labels.localUnknownBuild, color: theme.muted }
          : null;
    return h(
      View,
      {
        key: server.hostPort,
        style: {
          gap: 6,
          paddingTop: 8,
          borderTopWidth: 1,
          borderColor: theme.border,
        },
      },
      h(
        View,
        {
          style: {
            flexDirection: "row",
            justifyContent: "space-between",
            gap: 8,
          },
        },
        h(
          Text,
          { style: { ...font("bold", 16), color: theme.title, flexShrink: 1 } },
          server.title,
        ),
        running
          ? h(
              Text,
              { style: { ...font("medium", 13), color: theme.success } },
              labels.running,
            )
          : null,
      ),
      h(Text, { style: { ...font("regular", 13), color: theme.muted } }, meta),
      badge
        ? h(
            Text,
            { style: { ...font("medium", 13), color: badge.color } },
            badge.text,
          )
        : null,
      h(
        View,
        { style: { flexDirection: "row", flexWrap: "wrap", gap: 8 } },
        running
          ? button(
              labels.stopDevPreviewServer,
              () => devPreviewServersStore.switchTo(null),
              "plain",
            )
          : button(labels.switchTo, () =>
              devPreviewServersStore.switchTo(server),
            ),
      ),
    );
  };

  const localSection = showLocal
    ? card(
        "local",
        [
          h(
            Text,
            {
              key: "title",
              style: { ...font("bold", 17), color: theme.title },
            },
            labels.devPreviewServersTitle,
          ),
          h(
            Text,
            {
              key: "hint",
              style: { ...font("regular", 13), color: theme.muted },
            },
            labels.devPreviewServersHint,
          ),
          local.error
            ? h(
                Text,
                {
                  key: "error",
                  style: { ...font("regular", 13), color: theme.danger },
                },
                local.error,
              )
            : null,
          ...(!appSlug
            ? [
                h(
                  Text,
                  {
                    key: "noslug",
                    style: { ...font("regular", 15), color: theme.danger },
                  },
                  labels.noBuildSlug,
                ),
              ]
            : local.servers.length > 0
              ? local.servers.map(localRow)
              : [
                  h(
                    Text,
                    {
                      key: "none",
                      style: { ...font("regular", 15), color: theme.muted },
                    },
                    labels.noDevPreviewServers,
                  ),
                ]),
        ].filter(Boolean) as ReactNode[],
      )
    : null;

  const header = card(
    "header",
    [
      h(
        Text,
        { key: "title", style: { ...font("bold", 22), color: theme.title } },
        labels.title,
      ),
      h(
        Text,
        {
          key: "running",
          style: { ...font("regular", 15), color: theme.text },
        },
        `${labels.running}: ${
          now.kind === "local"
            ? now.server
              ? `${now.server.title} (${labels.localSuffix}, ${now.hostPort})`
              : `${now.hostPort} (${labels.localSuffix})`
            : now.kind === "preview"
              ? now.title
              : labels.base
        }`,
      ),
      // A dev preview server wins over a picked preview, so Metro is in use and the note would be wrong.
      __DEV__ && now.kind === "preview"
        ? h(
            Text,
            {
              key: "metro",
              style: { ...font("medium", 13), color: theme.warning },
            },
            labels.metroBypassed,
          )
        : null,
      preview.error
        ? h(
            Text,
            {
              key: "error",
              style: { ...font("regular", 13), color: theme.danger },
            },
            preview.error,
          )
        : null,
      h(
        View,
        {
          key: "actions",
          style: {
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 8,
            alignItems: "center",
          },
        },
        preview.activeId || (showLocal && local.activeUrl)
          ? button(labels.backToBase, () => preview.switchTo(null))
          : null,
        button(labels.refresh, () => preview.refresh(), "plain"),
        preview.loading
          ? h(ActivityIndicator, { key: "spinner", color: theme.primary })
          : null,
      ),
    ].filter(Boolean) as ReactNode[],
  );

  const empty =
    !preview.loading && preview.items.length === 0
      ? h(
          Text,
          {
            key: "empty",
            style: {
              ...font("regular", 15),
              color: theme.muted,
              textAlign: "center",
              padding: 16,
            },
          },
          preview.buildKey ? labels.empty : labels.noBuildKey,
        )
      : null;

  const incompatible =
    preview.incompatible.length > 0
      ? card("incompatible", [
          h(
            Text,
            {
              key: "title",
              style: { ...font("bold", 17), color: theme.title },
            },
            labels.incompatibleTitle,
          ),
          h(
            Text,
            {
              key: "hint",
              style: { ...font("regular", 13), color: theme.muted },
            },
            labels.incompatibleHint,
          ),
          ...preview.incompatible.map((p) =>
            h(
              Text,
              {
                key: p.id,
                style: { ...font("regular", 15), color: theme.text },
              },
              `${p.entry.title} · ${formatSize(p.entry.size)}`,
            ),
          ),
          h(
            View,
            { key: "actions", style: { flexDirection: "row" } },
            button(
              labels.deleteAll,
              () => preview.removeIncompatible(),
              "danger",
            ),
          ),
        ])
      : null;

  return h(
    ScrollView,
    {
      style: [{ backgroundColor: theme.background }, props.style],
      contentContainerStyle: { padding: 16, gap: 12 },
    },
    header,
    localSection,
    ...preview.items.map(row),
    empty,
    incompatible,
  );
}
