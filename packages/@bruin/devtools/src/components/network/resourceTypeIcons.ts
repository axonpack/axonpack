import type { MaterialIconName } from './IconButton';
import type { ResourceType } from '../../utils/network/resourceType';

export const RESOURCE_TYPE_ICONS: Record<ResourceType, MaterialIconName> = {
  'fetch-xhr': 'http',
  js: 'code',
  img: 'image',
  media: 'play-circle-outline',
  other: 'insert-drive-file',
};
