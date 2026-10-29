import type { PreviewStatus } from "../../utils/previews/preview-items.util";

export type PreviewListFonts = {
  /** Font family names, as registered in your app. Each falls back to the system font. */
  regular?: string;
  medium?: string;
  bold?: string;
};

export type PreviewListTheme = {
  /** "auto" follows the device appearance. Default "auto". */
  mode: "auto" | "light" | "dark";
  background: string;
  card: string;
  /** Behind the changelog and the progress track. */
  surface: string;
  /** A wash of the primary colour: the hero card and chips. */
  tint: string;
  /** The border of a tinted card. `border` all but vanishes on the tint. */
  tintBorder: string;
  border: string;
  title: string;
  text: string;
  /** Quiet text: branch, author, date, size. */
  muted: string;
  primary: string;
  primaryText: string;
  danger: string;
  /** Behind the error banner, under danger text. */
  dangerSurface: string;
  warning: string;
  success: string;
  /** Three more hues, so chips of different kinds read apart: the Expo server chip and the branch. */
  info: string;
  /** The Preview server chip. */
  accent2: string;
  /** The environment chip. */
  accent3: string;
  /** Card corner radius. Buttons scale from it. Default 14. */
  radius: number;
  fonts: PreviewListFonts;
};

/**
 * The colours an app already hands `@axonpack/expo-devtools` (its `Palette`), so one palette can
 * style both. Typed by shape only, so this package does not depend on expo-devtools.
 */
export type DevtoolsPaletteLike = {
  background: string;
  surface: string;
  sectionTint?: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  accent: string;
  success: string;
  error: string;
  /** Behind an error; the default theme's is used when it is missing. */
  errorSurface?: string;
  warning: string;
  /** Mapped to `info`, `accent2` and `accent3` when present. */
  codeKeyword?: string;
  jsonNumber?: string;
  jsonString?: string;
};

/** What the list's `theme` prop takes: nothing, a partial theme, or an expo-devtools palette. */
export type PreviewListThemeInput =
  Partial<PreviewListTheme> | DevtoolsPaletteLike;

export type PreviewListLabels = {
  /** @deprecated No longer shown: the list opens with the card for what runs now. */
  title: string;
  /** What is running now. */
  running: string;
  /** @deprecated No longer shown: the app's own bundle is the "default bundle" now. */
  base: string;
  /** Chip on the app's own bundle, whatever serves it: what runs without any switch. */
  defaultBundle: string;
  /** Kinds of bundle source, on the hero card, the server rows and the banner. */
  kindBuiltIn: string;
  kindExpoDevServer: string;
  kindDevPreviewServer: string;
  kindPreview: string;
  /** On the server or preview the app runs from. */
  active: string;
  /**
   * The title of the Metro the app starts on when `preview start` gave it none. Metro only knows
   * the app's name, which every server of the app shares.
   */
  defaultServerTitle: string;
  /** What a screen reader says for a server row. `{title}` and `{address}` are filled in. */
  switchToServer: string;
  switchToServerHint: string;
  /** @deprecated No longer shown: the header's Use the default bundle stops a picked server too. */
  stopServer: string;
  showDetails: string;
  hideDetails: string;
  /** Labels of the facts on the hero card. */
  app: string;
  version: string;
  platform: string;
  compatibility: string;
  compatibilityAppVersion: string;
  compatibilityFingerprint: string;
  author: string;
  commit: string;
  published: string;
  /** The header card's Branch row, and what a screen reader says before a row's branch. */
  branch: string;
  /** Before the branch name on a row's branch line. */
  branchPrefix: string;
  previewId: string;
  /** The EAS environment a preview was published with, and what a screen reader says before it. */
  environment: string;
  /** Before the environment name on its chip. */
  environmentPrefix: string;
  compatibilityKey: string;
  /** Goes back to the default bundle, stopping a dev preview server too. */
  backToDefault: string;
  /** @deprecated Use `backToDefault`. Still shown when an app sets it and not `backToDefault`. */
  backToBase: string;
  /** Shown in a debug build while a preview runs, since Metro is not used then. */
  metroBypassed: string;
  /**
   * The error banner: what went wrong on the first line, what to try on a second (the `*Hint`
   * labels). `{host}` and `{port}` are the bucket's. Text between backticks shows in a code font.
   */
  errorUnreachable: string;
  /** Under `errorUnreachable` on Android when the bucket is on localhost. */
  errorEmulatorHint: string;
  errorForbidden: string;
  /** Under `errorForbidden`. None when an app sets `errorForbidden` but not this. */
  errorForbiddenHint: string;
  errorNotFound: string;
  /** Under `errorNotFound`. None when an app sets `errorNotFound` but not this. */
  errorNotFoundHint: string;
  /** For a failure with no plainer words; the raw message goes under it. */
  errorGeneric: string;
  retry: string;
  dismiss: string;
  refresh: string;
  empty: string;
  noBuildKey: string;
  download: string;
  switchTo: string;
  update: string;
  delete: string;
  status: Record<PreviewStatus, string>;
  /** Under a preview's title: who published it and when. `{author}` and `{time}` are filled in. */
  byline: string;
  /** How long ago a preview was published. `{n}` is the count. Older than 30 days shows the date. */
  timeAgo: {
    now: string;
    minute: string;
    minutes: string;
    hour: string;
    hours: string;
    day: string;
    days: string;
  };
  /** Open and close a long changelog. */
  showMore: string;
  showLess: string;
  incompatibleTitle: string;
  incompatibleHint: string;
  deleteAll: string;
  /** Above the published previews. */
  previewsTitle: string;
  devPreviewServersTitle: string;
  devPreviewServersHint: string;
  noDevPreviewServers: string;
  /** In place of the servers, when the build has no slug baked in by the config plugin. */
  noBuildSlug: string;
  /** @deprecated No longer shown: the header's Use the default bundle stops a picked server. */
  stopDevPreviewServer: string;
  /** @deprecated No longer shown: the running line names the kind instead. */
  localSuffix: string;
  localIncompatible: string;
  localUnknownBuild: string;
};
