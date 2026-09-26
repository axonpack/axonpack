// Side-effect import: registers this package's tabs in React Native DevTools as early as possible.
if (__DEV__) require('./devtools-remote-tab/services/register-tab.service');

export { devtools } from './client/start-devtools.client';
export type {
  BuiltInThemeId,
  Palette,
  StatusBarStyle,
  ThemeConfig,
  ThemeId,
} from './core/constants/theme.const';
export type {
  DevtoolsConfig,
  DevtoolsConsoleConfig,
  DevtoolsNetworkConfig,
  DevtoolsPerformanceConfig,
  DevtoolsStorageConfig,
  DevtoolsCrashConfig,
  DevtoolsNavigationConfig,
} from './client/start-devtools.client';
export { DevtoolsProvider } from './core/components/devtools-provider.component';
export type { DevtoolsProviderProps } from './core/components/devtools-provider.component';
export { useDevtoolsPanel } from './core/services/use-devtools-panel.service';
export type { DevtoolsPanelControls } from './core/services/use-devtools-panel.service';
export { useDevtoolsWebView } from './core/services/use-devtools-webview.service';
export type { DevtoolsWebViewProps } from './core/services/use-devtools-webview.service';
export { useDevtoolsNavigation } from './core/services/use-devtools-navigation.service';
export type {
  NavigationContainerRefLike,
  NavigationContainerLike,
} from './features/navigation/services/attach-navigation.service';
export type {
  NavigationMove,
  NavigationRoute,
  NavigationRouterKind,
  NavigationState,
} from './features/navigation/stores/navigation.store';
export { CrashReportOverlay } from './features/crash/components/crash-report-overlay.component';
export type { CrashPopupDetail } from './features/crash/services/crash-popup.service';
export { DevtoolsErrorBoundary } from './features/crash/components/devtools-error-boundary.component';
export type { DevtoolsErrorBoundaryProps } from './features/crash/components/devtools-error-boundary.component';
export type {
  CrashBreadcrumb,
  CrashBreadcrumbCategory,
  CrashDeviceInfo,
  CrashKind,
  CrashNativeDetail,
  CrashRecord,
} from './features/crash/stores/crash.store';
export {
  formatCrashJson,
  formatCrashReport,
} from './features/crash/utils/format-crash-report.util';
export type { ConsoleLogEntry, ConsoleLogLevel } from './features/console/stores/console-log.store';
export type {
  ThrottlePresetId,
  ThrottleProfile,
} from './features/network/constants/throttle-presets.const';
export type { UserAgentPresetId } from './features/network/constants/user-agent-presets.const';
export type { ResolvedNetworkConditions } from './features/network/stores/network-conditions.store';
export type {
  NetworkLogEntry,
  NetworkLogStatus,
} from './features/network/stores/network-log.store';
export type {
  LongTaskEntry,
  MemorySample,
  StartupTiming,
  UserTimingEntry,
} from './features/performance/stores/performance.store';
export type {
  MarkOptions,
  MeasureOptions,
} from './features/performance/services/user-timing.service';
export {
  asyncStorageAdapter,
  defineStorageAdapter,
  mmkvAdapter,
  secureStoreAdapter,
} from './features/storage/services/define-adapter.service';
export type {
  AsyncStorageLikeDriver,
  MmkvLikeDriver,
  SecureStoreLikeDriver,
  StorageAdapter,
  StorageAdapterConfig,
  StorageAdapterDefinition,
  StorageAdapterKind,
  StorageKeyBlacklist,
  StorageReadResult,
  StorageValueType,
} from './features/storage/services/define-adapter.service';
export type { StorageEntry, StorageAdapterState } from './features/storage/stores/storage.store';
export type { StoredValueKind } from './features/storage/utils/classify-value.util';
