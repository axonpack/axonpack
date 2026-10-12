import { createElement as h, useState } from "react";

import {
  completeNativeUpdate,
  INSTALL_STATUS_DOWNLOADED,
  startNativeUpdate,
} from "../native-update";
import { useVersionCheck } from "../use-version-check";
import { DefaultUpdateModal, noop } from "./default-update-modal";
import type { UpdatePromptProps } from "./types";

export { DefaultUpdateModal };

/**
 * Checks for an update and shows a modal when one is needed. Uses the built-in modal unless you pass
 * `component`. A forced update cannot be dismissed.
 */
export const UpdatePrompt = ({
  component: Modal = DefaultUpdateModal,
  theme,
  labels,
  onUpdate,
  nativeUpdate,
  hideSkip,
  children,
  ...options
}: UpdatePromptProps) => {
  const check = useVersionCheck(options);
  const [dismissedFor, setDismissedFor] = useState<string | undefined>();
  const { result } = check;

  const visible =
    !!result?.isNeeded &&
    (result.isForced || dismissedFor !== result.latestVersion);
  if (!result || !visible) return children ?? null;

  return h(Modal, {
    visible,
    isForced: result.isForced,
    currentVersion: result.currentVersion,
    latestVersion: result.latestVersion,
    minimumVersion: result.minimumVersion,
    updateType: result.updateType,
    releaseNotes: result.releaseNotes,
    storeUrl: result.storeUrl,
    theme,
    labels,
    onUpdate: () => {
      if (onUpdate) return void onUpdate();
      if (!nativeUpdate) return void check.openStore();
      void startNativeUpdate(
        result.isForced ? "immediate" : "flexible",
        (s) => {
          if (s.status === INSTALL_STATUS_DOWNLOADED)
            void completeNativeUpdate();
        },
      ).then((outcome) => {
        if (outcome === "unavailable") void check.openStore();
      });
    },
    onLater: () => !result.isForced && setDismissedFor(result.latestVersion),
    onSkip: hideSkip ? noop : () => void check.skipVersion(),
  });
};
