import { ReactNativeDevtoolsPanel } from '@axonpack/react-native-devtools-tab';

import { AxonpackTab } from '../components/axonpack-tab.component';

export const axonpackTab = ReactNativeDevtoolsPanel.registerTab({
  name: 'Axonpack',
  component: AxonpackTab,
});
