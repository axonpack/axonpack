import { ReactNativeDevtoolsPanel } from '@axonpack/react-native-devtools-tab';

import { AxonpackTab } from '../components/axonpack-tab.component';

ReactNativeDevtoolsPanel.registerTab({
  name: 'Axonpack',
  component: AxonpackTab,
});
