import type { ComponentType, ReactNode } from "react";

import type { UseVersionCheckOptions } from "../use-version-check";
import type { UpdateType } from "../semver";

export type UpdateModalTheme = {
  backdrop: string;
  card: string;
  title: string;
  text: string;
  primary: string;
  primaryText: string;
  secondaryText: string;
};

export type UpdateModalLabels = {
  title: string;
  forcedTitle: string;
  message: (latestVersion: string, currentVersion: string) => string;
  forcedMessage: (minimumVersion: string | undefined) => string;
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
  /** Opens the store (or runs `onUpdate` from the prompt). */
  onUpdate: () => void;
  /** Hides the modal for this session. Does nothing when `isForced`. */
  onLater: () => void;
  /** Hides it and remembers this version. Does nothing when `isForced`. */
  onSkip: () => void;
  theme?: Partial<UpdateModalTheme>;
  labels?: Partial<UpdateModalLabels>;
};

export type UpdatePromptProps = UseVersionCheckOptions & {
  /** Your own modal. Default: DefaultUpdateModal. */
  component?: ComponentType<UpdateModalProps>;
  theme?: Partial<UpdateModalTheme>;
  labels?: Partial<UpdateModalLabels>;
  /**
   * Android: use Google Play's in-app update instead of leaving the app. A forced update runs the
   * immediate flow, any other the flexible one. Falls back to the store link when Play has nothing
   * to start or the native module is not linked.
   */
  nativeUpdate?: boolean;
  /** Replaces what the Update button does. */
  onUpdate?: () => void | Promise<void>;
  /** Hide the skip button. Default false. */
  hideSkip?: boolean;
  /** Rendered while there is nothing to show. */
  children?: ReactNode;
};
