import type { ComponentType, ReactNode } from "react";

import type { UseVersionCheckOptions } from "../use-version-check";
import type { UpdateType } from "../semver";

export type UpdateModalFonts = {
  /** Font family names, as registered in your app. Each falls back to the system font. */
  regular?: string;
  medium?: string;
  bold?: string;
};

export type UpdateModalTheme = {
  /** "auto" follows the device appearance. Default "auto". */
  mode: "auto" | "light" | "dark";
  backdrop: string;
  card: string;
  /** Behind the version row and the release notes. */
  surface: string;
  border: string;
  title: string;
  text: string;
  /** Quiet text: labels, and the "Skip this version" action. */
  muted: string;
  primary: string;
  primaryText: string;
  /** Tint behind the icon. */
  primarySoft: string;
  /** Used for a forced update. */
  danger: string;
  dangerSoft: string;
  /** Card corner radius. Buttons and boxes scale from it. Default 20. */
  radius: number;
  /** Default 340. */
  maxWidth: number;
  fonts: UpdateModalFonts;
};

export type UpdateModalLabels = {
  title: string;
  forcedTitle: string;
  message: (latestVersion: string, currentVersion: string) => string;
  forcedMessage: (minimumVersion: string | undefined) => string;
  installed: string;
  latest: string;
  releaseNotes: string;
  update: string;
  later: string;
  skip: string;
};

/** What a custom modal receives. Render anything; call the handlers. */
export type UpdateModalProps = {
  visible: boolean;
  isForced: boolean;
  currentVersion: string;
  latestVersion: string;
  minimumVersion?: string;
  updateType: UpdateType;
  releaseNotes?: string;
  storeUrl: string;
  /** True from the Update press until the store has been opened (or your `onUpdate` has finished). */
  isUpdating: boolean;
  /** Opens the store (or runs `onUpdate` from the prompt). */
  onUpdate: () => void;
  /** Hides the modal for this session. Does nothing when `isForced`. */
  onDismiss: () => void;
  /** Hides it and remembers this version. Does nothing when `isForced`. */
  onSkip: () => void;
  theme?: Partial<UpdateModalTheme>;
  labels?: Partial<UpdateModalLabels>;
  /** False when the skip button should not be shown. */
  canSkip: boolean;
  /** Start with the "What's new" notes open. Default false. */
  notesExpanded?: boolean;
  /** Shown in the round badge at the top. Default is an arrow. */
  icon?: ReactNode;
};

export type UpdatePromptProps = UseVersionCheckOptions & {
  /** Your own modal. Default: DefaultUpdateModal. */
  component?: ComponentType<UpdateModalProps>;
  theme?: Partial<UpdateModalTheme>;
  labels?: Partial<UpdateModalLabels>;
  icon?: ReactNode;
  /** Start with the "What's new" notes open. Default false. */
  notesExpanded?: boolean;
  /**
   * Android: update through Google Play's own update screen, instead of opening the store page. A
   * forced update runs the immediate flow, any other the flexible one. Falls back to the store link,
   * which leaves the app, when Play has nothing to start or the native module is not linked.
   */
  nativeUpdate?: boolean;
  /** Replaces what the Update button does. */
  onUpdate?: () => void | Promise<void>;
  /** Rendered while there is nothing to show. */
  children?: ReactNode;
};
