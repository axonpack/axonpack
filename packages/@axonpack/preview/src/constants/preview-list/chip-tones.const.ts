import type { ChipTone } from "../../components/preview-list/ui/chip.ui";
import type { BundleKind } from "../../utils/previews/running.util";
import type { PreviewStatus } from "../../utils/previews/preview-items.util";

// One hue per kind of chip, so they read apart at a glance. The meaning stays put across the
// list: green is fine to run, amber needs an update, red won't run as it is.

export const KIND_TONE: Record<BundleKind, ChipTone> = {
  preview: "primary",
  "dev-preview-server": "accent2",
  "expo-dev-server": "info",
  // The app's own bundle, nothing switched in. Its name is the header's title, so it is not a chip.
  "built-in": "neutral",
};

export const STATUS_TONE: Record<PreviewStatus, ChipTone> = {
  available: "neutral",
  downloading: "primary",
  downloaded: "success",
  "update-available": "warning",
  unpublished: "danger",
  broken: "danger",
};

export const ACTIVE_TONE: ChipTone = "success";
export const ENVIRONMENT_TONE: ChipTone = "accent3";
/** The branch line on a row, which is not a chip but takes a tone the same way. */
export const BRANCH_TONE: ChipTone = "info";
