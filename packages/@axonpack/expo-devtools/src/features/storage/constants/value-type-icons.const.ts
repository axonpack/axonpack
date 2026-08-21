import type { MaterialIconName } from '../../../core/components/ui/icon-button.ui';
import type { StoredValueKind } from '../utils/classify-value.util';

export const STORED_VALUE_KINDS: StoredValueKind[] = [
  'json-object',
  'json-array',
  'string',
  'number',
  'boolean',
  'buffer',
  'empty',
  'absent',
];

export const STORED_VALUE_ICONS: Record<StoredValueKind, MaterialIconName> = {
  'json-object': 'data-object',
  'json-array': 'data-array',
  string: 'text-fields',
  number: 'numbers',
  boolean: 'toggle-on',
  buffer: 'memory',
  empty: 'remove',
  absent: 'help-outline',
};

export const STORED_VALUE_LABELS: Record<StoredValueKind, string> = {
  'json-object': 'Object',
  'json-array': 'Array',
  string: 'String',
  number: 'Number',
  boolean: 'Boolean',
  buffer: 'Binary',
  empty: 'Empty',
  absent: 'Missing',
};
