import { createElement as h, useState } from "react";

import {
  completeNativeUpdate,
  INSTALL_STATUS_DOWNLOADED,
  startNativeUpdate,
} from "../native-update";
import { useVersionCheck } from "../use-version-check";
import { DefaultUpdateModal } from "./default-update-modal";
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
  icon,
  notesExpanded,
  onUpdate,
  nativeUpdate,
  children,
  ...options
}: UpdatePromptProps) => {
  const check = useVersionCheck(options);
  const [dismissedFor, setDismissedFor] = useState<string | undefined>();
  const [isUpdating, setIsUpdating] = useState(false);
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
    icon,
    notesExpanded,
    isUpdating,
    onUpdate: () => {
      if (isUpdating) return;
      setIsUpdating(true);
      const run = async () => {
        if (onUpdate) return onUpdate();
        if (!nativeUpdate) return check.openStore();
        const outcome = await startNativeUpdate(
          result.isForced ? "immediate" : "flexible",
          (s) => {
            if (s.status === INSTALL_STATUS_DOWNLOADED)
              void completeNativeUpdate();
          },
        );
        if (outcome === "unavailable") await check.openStore();
      };
      run()
        .catch(() => {})
        .finally(() => setIsUpdating(false));
    },
    onDismiss: () => !result.isForced && setDismissedFor(result.latestVersion),
    canSkip: result.canSkip,
    onSkip: () => void check.skipVersion(),
  });
};
