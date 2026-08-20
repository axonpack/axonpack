import { TOUCH_TARGET } from '../../constants/metrics.const';
import { makeThemedStyles } from '../../utils/themed-styles.util';

export const useTreeStyles = makeThemedStyles((COLORS) => ({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    minHeight: TOUCH_TARGET.dense,
    paddingVertical: 4,
  },
  toggle: {
    width: 16,
    alignItems: 'center',
  },
  text: {
    flex: 1,
    fontFamily: 'monospace',
    fontSize: 12,
    flexWrap: 'wrap',
  },
  key: {
    color: COLORS.jsonKey,
  },
  punctuation: {
    color: COLORS.textSecondary,
  },
  string: {
    color: COLORS.jsonString,
  },
  number: {
    color: COLORS.jsonNumber,
  },
  boolean: {
    color: COLORS.jsonNumber,
  },
  nullValue: {
    color: COLORS.textSecondary,
  },
}));
