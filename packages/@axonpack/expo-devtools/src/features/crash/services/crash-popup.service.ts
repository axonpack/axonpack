/**
 * Which sheet a captured crash opens. Read by `CrashReportOverlay` at render time rather than passed
 * as a prop: the overlay is mounted by the consumer, but the decision belongs to the client config,
 * and threading it through would mean the app had to know.
 *
 * There is no "whether" to go with it — a captured crash always opens a sheet. The gate is capture
 * itself: nothing reaches here unless `crash.enabled` and the devtools gates let it.
 */
/**
 * How much a crash sheet shows. Set through `crash.popupDetail`, not by hand.
 *
 * - `'full'` — the developer sheet: message, stack, device, breadcrumbs.
 * - `'compact'` — a plain notice with Share, Copy and Dismiss, naming nothing about this package.
 *
 * `crash.popupDetail: 'auto'` — the default — picks `'full'` when the panel is shipping and
 * `'compact'` when it is not.
 */
export type CrashPopupDetail = 'full' | 'compact';

/**
 * `full` is the five-tab developer sheet; `compact` is a plain notice with Share and Close.
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
