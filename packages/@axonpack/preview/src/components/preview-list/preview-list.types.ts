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
  /** @deprecated No longer shown: the default is named by what serves it, such as "Default server". */
  base: string;
  /**
   * Chip on the bundle built into the app while it runs, such as in a release build: what runs
   * without any switch. A Metro server is not a bundle, so it gets `defaultServerChip` instead.
   */
  defaultBundle: string;
  /**
   * Chip on the Metro the app starts on with nothing picked: on its row, and on the header card
   * while it runs.
   */
  defaultServerChip: string;
  /**
   * Kinds of bundle source: the hero card's chip for a preview, the banner, and what a screen
   * reader says for a server's chip.
   */
  kindBuiltIn: string;
  kindExpoDevServer: string;
  kindDevPreviewServer: string;
  kindPreview: string;
  /**
   * A server no look has found answering and nothing was saved about, so its kind is not known:
   * its chip, with no hue, and what a screen reader says for it.
   */
  kindServer: string;
  /** Before a server's kind on its chip, as in "server: Expo". */
  serverPrefix: string;
  /** A server's kind on its chip, after `serverPrefix`. */
  serverExpo: string;
  serverPreview: string;
  /** On the server or preview the app runs from. */
  active: string;
  /**
   * The title of the Metro the app starts on when `preview start` gave it none. Metro only knows
   * the app's name, which every server of the app shares.
   */
  defaultServerTitle: string;
  /** On the header card and on the row of the server the app runs from, once it stops answering. */
  offline: string;
  /** Under the header card's chips when a server picked in the list stops answering. */
  offlineHint: string;
  /**
   * Under the header card's chips when the Metro the app starts on stops answering. The default
   * bundle comes from that same server, so starting it again is the only way back.
   */
  offlineDefaultHint: string;
  /** What a screen reader says for a server row. `{title}` and `{address}` are filled in. */
  switchToServer: string;
  switchToServerHint: string;
  /** @deprecated No longer shown: the header's Back to default stops a picked server too. */
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
  /**
   * Goes back to the default, stopping a picked dev preview server too: the Metro the app starts
   * on in a debug build, the bundle built into the app in a release build.
   */
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
  /** What a screen reader says before a preview's status. */
  statusName: string;
  /** Before a preview's status on its chip, as in "status: downloaded". */
  statusPrefix: string;
  /** A preview's status on its chip, kept to a word or two. */
  statusShort: Record<PreviewStatus, string>;
  /** Under the chips of a preview that stopped while starting, saying what happened. */
  brokenHint: string;
  /**
   * @deprecated Use `statusShort`. An app's own text here still shows on the chip for any status
   * it sets no `statusShort` for.
   */
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
  /** @deprecated No longer shown: the header's Back to default stops a picked server. */
  stopDevPreviewServer: string;
  /** @deprecated No longer shown: the running line names the kind instead. */
  localSuffix: string;
  localIncompatible: string;
  localUnknownBuild: string;
};
