import { configure } from './configure.client';
import { useSupport } from './stores/preview-support.store';

export { configure, useSupport };
export type { PreviewSupportData } from './stores/preview-support.store';
export type { DevtoolsSupport } from '../../../core/stores/supports.store';
export type { DevPreviewServersOptions, PreviewConfig, PreviewS3Config } from '@axonpack/preview';

/**
 * The named exports as one object, so `import PreviewV0Support from` and
 * `import * as PreviewV0Support from` work the same way. Types are named exports only.
 */
const PreviewV0Support = { configure, useSupport };
export default PreviewV0Support;
