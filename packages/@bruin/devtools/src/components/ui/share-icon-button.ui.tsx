import { Share } from 'react-native';

import { IconButton } from './icon-button.ui';
import { COLORS } from '../../constants/colors.const';

async function share(value: string) {
  try {
    await Share.share({ message: value });
  } catch {
    // user dismissed the share sheet, or sharing isn't available — nothing to recover.
  }
}

export function ShareIconButton({ value }: { value: string }) {
  return <IconButton name="share" color={COLORS.textSecondary} onPress={() => share(value)} />;
}
