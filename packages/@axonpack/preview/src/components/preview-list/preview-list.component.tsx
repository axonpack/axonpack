import {
  isValidElement,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  FlatList,
  RefreshControl,
  View,
  useColorScheme,
  type FlatListProps,
  type ListRenderItemInfo,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import {
  devPreviewServersStore,
  useDevPreviewServersState,
} from "../../stores/dev-preview-servers/dev-preview-servers.store";
import { buildSlug } from "../../services/native/build-info.service";
import { nativeModule } from "../../services/native/native.service";
import {
  currentPlatform,
  devServersSetup,
} from "../../utils/config/config.util";
import { runsFromServer, sameServer } from "../../utils/previews/running.util";
import { describeListError } from "../../utils/preview-list/list-error.util";
import { previewsStore } from "../../stores/previews/previews.store";
import { ConfigContext } from "../preview-provider/preview-provider.component";
import { usePreview } from "../../services/previews/use-preview.service";
import { usePreviewStatus } from "../../services/previews/use-preview-status.service";
import { DEFAULT_LABELS } from "../../constants/preview-list/theme.const";
import { resolveTheme } from "../../utils/preview-list/theme.util";
import {
  type ListItem,
  buildListItems,
} from "../../utils/preview-list/list-items.util";
import { Button } from "./ui/button.ui";
import { SectionHeader } from "./ui/section-header.ui";
import { Scanning } from "./ui/scanning.ui";
import { DevServerHosts } from "./dev-server-hosts.component";
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

/**
 * FlatList props the list keeps for itself: its rows and how they are laid out and spaced (`data`,
 * `getItem`, `getItemCount`, `renderItem`, `keyExtractor`, `ItemSeparatorComponent`,
 * `CellRendererComponent`, `getItemLayout`, `numColumns`, `columnWrapperStyle`, `horizontal`), pull to refresh (`refreshing`, `onRefresh`,
 * `refreshControl`, coloured from the theme), and `ListEmptyComponent`, which could never show
 * since the list always has its section headings and says itself when nothing is published.
 */
type OwnedListProps =
  | "data"
  | "getItem"
  | "getItemCount"
  | "renderItem"
  | "keyExtractor"
  | "ItemSeparatorComponent"
  | "CellRendererComponent"
  | "getItemLayout"
  | "numColumns"
  | "columnWrapperStyle"
  | "horizontal"
  | "refreshing"
  | "onRefresh"
  | "refreshControl"
  | "ListEmptyComponent"
  | "ListHeaderComponent";

/** Every other FlatList prop is passed through, such as `onScroll`, `testID` or `ListFooterComponent`. */
export type PreviewListProps = Omit<FlatListProps<unknown>, OwnedListProps> & {
  /**
   * Nothing for the built-in light or dark, a partial theme, or the palette the app passes
   * expo-devtools, so both look the same.
   */
  theme?: PreviewListThemeInput;
  labels?: Partial<PreviewListLabels>;
  /** The FlatList's own style, over the list's background colour. */
  style?: StyleProp<ViewStyle>;
  /**
   * Over the list's padding: 16 all round, and room at the end for a floating tab bar. Set
   * `paddingBottom` to fit the app's own tab bar, or none.
   */
  contentContainerStyle?: StyleProp<ViewStyle>;
  /** The app's own header, above the list's (the error banner and the header card). */
  ListHeaderComponent?: FlatListProps<unknown>["ListHeaderComponent"];
};

const keyOf = (item: ListItem) => item.key;

/**
 * The previews published for this build, with what is running now, and the downloads made for
 * another build in a section of their own. Needs a `<PreviewProvider>` above it.
 */
export function PreviewList(props: PreviewListProps) {
  const {
    theme: themeInput,
    labels: labelsInput,
    style,
    contentContainerStyle,
    ListHeaderComponent: AppHeader,
    ...listProps
  } = props;
  const preview = usePreview();
  const local = useDevPreviewServersState();
  const showLocal = __DEV__ && preview.devPreviewServers;
  // Without the slug the plugin bakes in, other apps' servers can't be told apart, so none are listed.
  const appSlug = buildSlug();
  const config = useContext(ConfigContext);
  const setup = useMemo(
    () => devServersSetup(config?.devPreviewServers),
    [config?.devPreviewServers],
  );
  // Before the watch below, whose first look asks these hosts.
  useEffect(() => {
    if (showLocal) devPreviewServersStore.configure(setup);
  }, [showLocal, setup]);
  // Look for servers only while the list is on screen.
  useEffect(
    () => (showLocal && appSlug ? devPreviewServersStore.watch() : undefined),
    [showLocal, appSlug],
  );
  const [pulling, setPulling] = useState(false);
  // What "2 minutes ago" counts from: when the list opened, then each refresh QA asks for.
  const [shownAt, setShownAt] = useState(Date.now);
  const bucketUrl = config?.url ?? "";
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
  const theme = resolveTheme(themeInput, useColorScheme());
  const labels: PreviewListLabels = {
    ...DEFAULT_LABELS,
    ...labelsInput,
    // An app written before the rename still sees its own text.
    backToDefault:
      labelsInput?.backToDefault ??
      labelsInput?.backToBase ??
      DEFAULT_LABELS.backToDefault,
    // An app's own text from before the hint labels holds both sentences, so it gets no hint.
    errorForbiddenHint:
      labelsInput?.errorForbiddenHint ??
      (labelsInput?.errorForbidden ? "" : DEFAULT_LABELS.errorForbiddenHint),
    errorNotFoundHint:
      labelsInput?.errorNotFoundHint ??
      (labelsInput?.errorNotFound ? "" : DEFAULT_LABELS.errorNotFoundHint),
    status: { ...DEFAULT_LABELS.status, ...labelsInput?.status },
    // An app's own status text from before the short names still shows on the chip.
    statusShort: {
      ...DEFAULT_LABELS.statusShort,
      ...labelsInput?.status,
      ...labelsInput?.statusShort,
    },
    timeAgo: { ...DEFAULT_LABELS.timeAgo, ...labelsInput?.timeAgo },
  };
  const status = usePreviewStatus(labels);
  const now = status.running;

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
        devServersScanning: local.scanning,
        hosts: local.hosts,
        allowCustomHosts: setup.allowCustomHosts,
        loading: preview.loading,
        buildKey: preview.buildKey,
        items: preview.items,
        incompatible: preview.incompatible,
      }),
    [showLocal, appSlug, local, preview, setup],
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
            afterTitle=<Scanning
              theme={theme}
              label={labels.scanning}
              visible={item.scanning}
            />
          />
        );
      case "dev-server-hosts":
        return (
          <DevServerHosts
            theme={theme}
            labels={labels}
            hosts={item.hosts}
            allowCustomHosts={item.allowCustomHosts}
            position={item.position}
            onAdd={devPreviewServersStore.addHost}
            onRemove={devPreviewServersStore.removeHost}
          />
        );
      case "dev-server": {
        const active = runsFromServer(now, item.server.hostPort);
        return (
          <DevServerRow
            theme={theme}
            labels={labels}
            server={item.server}
            active={active}
            offline={active && status.online === false}
            isDefault={
              defaultMetro !== null &&
              sameServer(item.server.hostPort, defaultMetro)
            }
            position={item.position}
            onSwitch={devPreviewServersStore.switchTo}
          />
        );
      }
      case "hint":
        return (
          <HintRow
            theme={theme}
            text={labels[item.hint]}
            tone={item.tone}
            position={item.position}
          />
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

  const refreshAll = run(() => {
    // As an updater, so the time is read when React applies it. The linter can't tell this
    // function only runs on a press, and takes a direct call for a read during render.
    setShownAt(Date.now);
    return status.refresh();
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
      {AppHeader == null ? null : isValidElement(AppHeader) ? (
        AppHeader
      ) : (
        <AppHeader />
      )}
      {failure ? (
        <ErrorBanner
          theme={theme}
          labels={labels}
          message={failure.message}
          hint={failure.hint}
          onRetry={failure.retryable ? () => lastAction.current() : undefined}
          onDismiss={previewsStore.clearError}
        />
      ) : null}
      <HeroCard
        theme={theme}
        labels={labels}
        status={status}
        onBackToDefault={run(status.backToDefault)}
        onRefresh={refreshAll}
      />
    </View>
  );

  return (
    <FlatList<ListItem>
      // A tap on Add while the keyboard is up adds, instead of only closing the keyboard.
      keyboardShouldPersistTaps="handled"
      // iOS: room for the keyboard, and Add a host's field scrolled up above it. Android's window
      // resizes for the keyboard instead.
      automaticallyAdjustKeyboardInsets
      {...listProps}
      data={items}
      keyExtractor={keyOf}
      renderItem={renderItem}
      ItemSeparatorComponent={RowGap}
      ListHeaderComponent={header}
      refreshControl={
        <RefreshControl
          // Only a pull shows the pull spinner. Tied to every load, iOS shifts the list down by
          // the spinner's height when the first load starts, and the top of the list is cut off.
          refreshing={pulling}
          onRefresh={() => {
            setPulling(true);
            refreshAll().finally(() => setPulling(false));
          }}
          tintColor={theme.muted}
          colors={[theme.primary]}
          progressBackgroundColor={theme.card}
        />
      }
      style={[{ backgroundColor: theme.background }, style]}
      contentContainerStyle={[
        // The end of the list clears a floating tab bar (iOS 26's sits over the last 90 or so).
        { padding: 16, paddingBottom: 112 },
        contentContainerStyle,
      ]}
    />
  );
}
