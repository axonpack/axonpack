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
  warning: string;
  success: string;
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
  warning: string;
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
  /** On the server the app runs from. */
  active: string;
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
  branch: string;
  previewId: string;
  /** The EAS environment a preview was published with. */
  environment: string;
  compatibilityKey: string;
  /** Goes back to the default bundle, stopping a dev preview server too. */
  backToDefault: string;
  /** @deprecated Use `backToDefault`. Still shown when an app sets it and not `backToDefault`. */
  backToBase: string;
  /** Shown in a debug build while a preview runs, since Metro is not used then. */
  metroBypassed: string;
  refresh: string;
  empty: string;
  noBuildKey: string;
  download: string;
  switchTo: string;
  update: string;
  delete: string;
  status: Record<PreviewStatus, string>;
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
  stopDevPreviewServer: string;
  /** @deprecated No longer shown: the running line names the kind instead. */
  localSuffix: string;
  localIncompatible: string;
  localUnknownBuild: string;
};
