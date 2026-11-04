import { configure } from './configure.client';

export { configure };
export type { DevtoolsSupport } from '../../../core/stores/supports.store';
export type { DevPreviewServersOptions, PreviewConfig, PreviewS3Config } from '@axonpack/preview';

/**
 * The named exports as one object, so `import PreviewV0Support from` and
 * `import * as PreviewV0Support from` work the same way. Types are named exports only.
 */
const PreviewV0Support = { configure };
export default PreviewV0Support;
