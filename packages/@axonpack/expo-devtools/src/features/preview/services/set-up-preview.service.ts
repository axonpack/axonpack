import type { PreviewConfig } from '@axonpack/preview';

import { previewStore, type PreviewModule } from '../stores/preview.store';

export const PREVIEW_NOT_INSTALLED =
  "The devtools config has `preview`, but @axonpack/preview isn't installed. Install it with " +
  '`npx expo install @axonpack/preview expo-file-system`, add `@axonpack/preview` to the plugins ' +
  'in app.json, and rebuild the app.';

/**
 * Loads `@axonpack/preview` for `config.preview`. It is an optional peer, so it may not be there.
 *
 * The `require` sits directly inside its `try`, which is what Metro marks as an optional
 * dependency: a package that isn't installed is then a `Cannot find module` throw here rather
 * than a build error (see `detect-router.service.ts`). It runs only when the app passed a config,
 * so an app without one never loads the package.
 *
 * With the devtools off it never throws: a release build must not crash over a devtools setting.
 * The provider still mounts when the package loads, since a preview's own start needs it.
 */
export function setUpPreview(config: PreviewConfig, devtoolsEnabled: boolean) {
  let preview: PreviewModule | undefined;
  try {
    preview = require('@axonpack/preview');
  } catch {
    // Not installed.
  }
  // A package whose own load threw comes back undefined from Metro rather than throwing here.
  if (preview?.PreviewProvider) previewStore.setUp(preview, config);
  else if (devtoolsEnabled) throw new Error(PREVIEW_NOT_INSTALLED);
}
