import type { MaterialIconName } from '../../components/network/icon-button.ui';
import type { ResourceType } from '../../utils/network/resource-type.util';

export const RESOURCE_TYPE_ICONS: Record<ResourceType, MaterialIconName> = {
  'fetch-xhr': 'http',
  js: 'code',
  img: 'image',
  media: 'play-circle-outline',
  other: 'insert-drive-file',
};
