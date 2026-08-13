import { registerRootComponent } from 'expo';

import App from './App';
import { devtools } from './devtools';

devtools.init();

registerRootComponent(App);
