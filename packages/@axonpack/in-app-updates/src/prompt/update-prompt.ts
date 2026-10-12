import { createElement as h, useEffect, useState } from "react";

import {
  completeNativeUpdate,
  getNativeUpdateState,
  INSTALL_STATUS_DOWNLOADED,
  startNativeUpdate,
} from "../native-update";
import { reactNative } from "../runtime";
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
  // A flexible update that finished downloading earlier, maybe while the app was closed.
  const [downloaded, setDownloaded] = useState(false);
  const { result } = check;

  // Google's guide: on start and on every return to the foreground, resume an immediate update the
  // user left, and notice a flexible update that is waiting to be installed.
  useEffect(() => {
    if (!nativeUpdate) return undefined;
    let alive = true;
    const sync = async () => {
      const state = await getNativeUpdateState();
      if (!alive) return;
      setDownloaded(state === "downloaded");
      if (state === "in-progress") void startNativeUpdate("immediate");
    };
    void sync();
    const subscription = reactNative()?.AppState.addEventListener(
      "change",
      (next) => {
        if (next === "active") void sync();
      },
    );
    return () => {
      alive = false;
      subscription?.remove();
    };
  }, [nativeUpdate]);

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
        // The update is already downloaded, so installing it is all that is left.
        if (downloaded) return completeNativeUpdate();
        const outcome = await startNativeUpdate(
          result.isForced ? "immediate" : "flexible",
          (s) => {
            if (s.status === INSTALL_STATUS_DOWNLOADED)
              void completeNativeUpdate();
          },
        );
        // Play had nothing to start, or could not start it: the store page is the way left.
        if (outcome === "unavailable" || outcome === "failed") {
          await check.openStore();
        }
        // A flexible update now downloads in the background, so the modal is not needed again.
        if (outcome === "accepted" && !result.isForced) {
          setDismissedFor(result.latestVersion);
        }
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
