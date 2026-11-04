import type { PreviewConfig } from '@axonpack/preview';
import type { ReactNode } from 'react';

import { PreviewTab } from './components/preview-tab.component';
import type { DevtoolsSupport } from '../../../core/stores/supports.store';

/** This entry is for `@axonpack/preview` 0.x. A new major of preview gets its own entry. */
const SUPPORTED_MAJOR = '0';

export const PREVIEW_NOT_INSTALLED =
  "The devtools config sets up preview, but @axonpack/preview isn't installed. Install it with " +
  '`npx expo install @axonpack/preview expo-file-system`, add `@axonpack/preview` to the plugins ' +
  'in app.json, and rebuild the app.';

const majorOf = (version: string) => version.split('.')[0];

export const previewWrongMajor = (version: string) =>
  `The devtools config uses @axonpack/expo-devtools/support/preview/v${SUPPORTED_MAJOR}, which is ` +
  `for @axonpack/preview ${SUPPORTED_MAJOR}.x, but @axonpack/preview ${version} is installed. ` +
  `Import the support from \`@axonpack/expo-devtools/support/preview/v${majorOf(version)}\` ` +
  "instead, and update @axonpack/expo-devtools if it doesn't have that entry yet.";

/**
 * `@axonpack/preview` is an optional peer, so it may not be there. Each `require` sits directly
 * inside the `try` at module scope, for the reasons in `detect-router.service.ts`: Metro then treats
 * a missing package as a throw here rather than a build error, and a package whose own load throws
 * lands in the `catch` too instead of a red box. Only an app that imports this module loads it.
 * The version comes first, so a preview whose own load throws still gets its major checked.
 */
let version: string | undefined;
let preview: typeof import('@axonpack/preview') | undefined;
try {
  version = require('@axonpack/preview/package.json').version;
  preview = require('@axonpack/preview');
} catch {
  // Not installed. `configure` reports it.
}

/**
 * Sets preview up through the devtools: its provider goes around the app, with the devtools on or
 * off, and a Preview tab joins the panel and React Native DevTools. Pass the result in the
 * devtools config's `supports`.
 *
 * With `@axonpack/preview` missing, or on a major this entry isn't for, it never throws. The
 * devtools log the error with `console.error` at start, and the Preview tab shows it.
 */
export function configure(config: PreviewConfig): DevtoolsSupport {
  const tab = { id: 'preview', title: 'Preview', icon: 'preview' } as const;
  if (version && majorOf(version) !== SUPPORTED_MAJOR) {
    return { ...tab, error: previewWrongMajor(version) };
  }
  // Metro can also hand back a module whose own load failed as undefined or empty.
  if (!preview?.PreviewProvider) return { ...tab, error: PREVIEW_NOT_INSTALLED };
  const { PreviewProvider, PreviewList } = preview;
  return {
    ...tab,
    Provider: ({ children }: { children?: ReactNode }) => (
      <PreviewProvider config={config}>{children}</PreviewProvider>
    ),
    Tab: () => <PreviewTab List={PreviewList} />,
    Panel: () => <PreviewTab List={PreviewList} virtualized={false} />,
  };
}
