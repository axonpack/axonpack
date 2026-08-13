export type ResourceType = 'fetch-xhr' | 'js' | 'img' | 'media' | 'other';

export const RESOURCE_TYPE_LABELS: Record<ResourceType, string> = {
  'fetch-xhr': 'Fetch/XHR',
  js: 'JS',
  img: 'Img',
  media: 'Media',
  other: 'Other',
};

export const RESOURCE_TYPES: ResourceType[] = ['fetch-xhr', 'js', 'img', 'media', 'other'];

export function classifyResourceType(mimeType: string | undefined): ResourceType {
  if (!mimeType) return 'fetch-xhr';

  if (mimeType.startsWith('image/')) return 'img';
  if (mimeType.startsWith('audio/') || mimeType.startsWith('video/')) return 'media';
  if (mimeType.includes('javascript') || mimeType === 'application/x-javascript') return 'js';
  if (mimeType.includes('json') || mimeType.includes('text/plain') || mimeType.includes('xml')) {
    return 'fetch-xhr';
  }

  return 'other';
}
