import { useContext, useEffect, useMemo, useRef, useState } from "react";
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
import { nativeModule } from "../../services/native/native.service";
import { currentPlatform } from "../../utils/config/config.util";
import { runsFromServer, sameServer } from "../../utils/previews/running.util";
import { describeListError } from "../../utils/preview-list/list-error.util";
import { previewsStore } from "../../stores/previews/previews.store";
import { ConfigContext } from "../preview-provider/preview-provider.component";
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
import { ErrorBanner } from "./error-banner.component";
import { HeroCard } from "./hero-card.component";
import { HintRow } from "./hint-row.component";
import { IncompatibleRow } from "./incompatible-row.component";
import { PreviewRow } from "./preview-row.component";
import { RowGap } from "./row-gap.component";
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
  // What "2 minutes ago" counts from: when the list opened, then each refresh QA asks for.
  const [shownAt, setShownAt] = useState(Date.now);
  const bucketUrl = useContext(ConfigContext)?.url ?? "";
  // What QA asked for last, so Retry asks again. The first load is a refresh.
  const lastAction = useRef<() => unknown>(preview.refresh);
  const run =
    <A extends unknown[], R>(action: (...args: A) => R) =>
    (...args: A): R => {
      lastAction.current = () => action(...args);
      return action(...args);
    };
  // The banner says it plainly; the raw text is for the developer.
  useEffect(() => {
    if (preview.error) console.log(`@axonpack/preview: ${preview.error}`);
  }, [preview.error]);
  const theme = resolveTheme(props.theme, useColorScheme());
  const labels: PreviewListLabels = {
    ...DEFAULT_LABELS,
    ...props.labels,
    // An app written before the rename still sees its own text.
    backToDefault:
      props.labels?.backToDefault ??
      props.labels?.backToBase ??
      DEFAULT_LABELS.backToDefault,
    status: { ...DEFAULT_LABELS.status, ...props.labels?.status },
    timeAgo: { ...DEFAULT_LABELS.timeAgo, ...props.labels?.timeAgo },
  };

  // What runs now when that is the default, else what native says it starts on.
  const defaultMetro =
    (now.kind === "default" ? now.hostPort : null) ??
    nativeModule()?.state().defaultServer ??
    null;

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
      accessibilityLabel={`${labels.deleteAll}, ${labels.incompatibleTitle}`}
      onPress={run(preview.removeIncompatible)}
      kind="danger"
      quiet
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
            active={runsFromServer(now, item.server.hostPort)}
            isDefault={
              defaultMetro !== null &&
              sameServer(item.server.hostPort, defaultMetro)
            }
            position={item.position}
            onSwitch={devPreviewServersStore.switchTo}
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
            now={shownAt}
            onDownload={run(preview.download)}
            onSwitch={run(preview.switchTo)}
            onDelete={run(preview.remove)}
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
        return (
          <IncompatibleRow
            theme={theme}
            labels={labels}
            preview={item.preview}
            position={item.position}
            now={shownAt}
          />
        );
    }
  };

  const runningEntry =
    now.kind === "preview"
      ? (preview.items.find((i) => i.id === now.id)?.entry ?? null)
      : null;
  const refreshAll = run(() => {
    // As an updater, so the time is read when React applies it. The linter can't tell this
    // function only runs on a press, and takes a direct call for a read during render.
    setShownAt(Date.now);
    return Promise.all([
      preview.refresh(),
      showLocal ? devPreviewServersStore.refresh() : null,
    ]);
  });
  const failure = preview.error
    ? describeListError(preview.error, {
        bucketUrl,
        platform: currentPlatform(),
        labels,
      })
    : null;
  const header = (
    <View style={{ gap: 12, marginBottom: 12 }}>
      {failure ? (
        <ErrorBanner
          theme={theme}
          labels={labels}
          message={failure.message}
          detail={failure.detail}
          onRetry={() => lastAction.current()}
          onDismiss={previewsStore.clearError}
        />
      ) : null}
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
        loading={preview.loading}
        canGoBack={Boolean(preview.activeId)}
        onBackToDefault={run(() => preview.switchTo(null))}
        onRefresh={refreshAll}
      />
    </View>
  );

  return (
    <FlatList<ListItem>
      data={items}
      keyExtractor={keyOf}
      renderItem={renderItem}
      ItemSeparatorComponent={RowGap}
      ListHeaderComponent={header}
      // Only a pull shows the pull spinner. Tied to every load, iOS shifts the list down by the
      // spinner's height when the first load starts, and the top of the list is cut off.
      refreshing={pulling}
      onRefresh={() => {
        setPulling(true);
        refreshAll().finally(() => setPulling(false));
      }}
      style={[{ backgroundColor: theme.background }, props.style]}
      contentContainerStyle={{ padding: 16 }}
    />
  );
}
