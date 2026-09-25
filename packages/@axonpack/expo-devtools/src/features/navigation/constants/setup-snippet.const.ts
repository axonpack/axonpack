/** What the waiting tab shows a React Navigation app: the two ways to reach its container. */
export const NAVIGATION_SETUP_SNIPPET = `import { NavigationContainer } from '@react-navigation/native';
import { DevtoolsProvider } from '@axonpack/expo-devtools';

// Inside the container, and the tab finds it on its own:
<NavigationContainer>
  <DevtoolsProvider>{/* your navigators */}</DevtoolsProvider>
</NavigationContainer>;

// With the provider above the container, hand the ref over instead,
// from the component that owns the container:
//   useDevtoolsNavigation(navigationRef);`;
