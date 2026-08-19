/**
 * Which sheet a captured crash opens. Read by `CrashReportOverlay` at render time rather than passed
 * as a prop: the overlay is mounted by the consumer, but the decision belongs to the client config,
 * and threading it through would mean the app had to know.
 *
 * There is no "whether" to go with it — a captured crash always opens a sheet. The gate is capture
 * itself: nothing reaches here unless `crash.enabled` and the devtools gates let it.
 */
export type CrashPopupDetail = 'full' | 'compact';

/**
 * `full` is the five-tab developer sheet; `compact` is a plain notice with Share and Restart.
 *
 * Compact rather than full is the right default the moment the devtools panel isn't shipping: the
 * full sheet carries this package's own branding, a raw JSON dump and a stack tree, none of which
 * belong in front of somebody using the app.
 */
let popupDetail: CrashPopupDetail = 'compact';

export function setCrashPopupDetail(detail: CrashPopupDetail) {
  popupDetail = detail;
}

export function getCrashPopupDetail(): CrashPopupDetail {
  return popupDetail;
}
