import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import {
  createNativeStackNavigator,
  type NativeStackNavigationProp,
} from '@react-navigation/native-stack';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { ActionButton } from './ActionButton';
import { CheckoutFlowDemo } from './CheckoutFlowDemo';

type DemoStack = {
  Home: undefined;
  Details: { id: number; token?: string };
  Settings: undefined;
  Checkout: undefined;
};

type Navigation = NativeStackNavigationProp<DemoStack>;

const Stack = createNativeStackNavigator<DemoStack>();

function HomeScreen() {
  const navigation = useNavigation<Navigation>();
  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <Text style={styles.title}>Home</Text>
      <Text style={styles.note}>
        Every button here is a move the Navigation tab records, with the line it was dispatched
        from. Open the panel after a few to see the history, the route on screen and the state tree.
      </Text>
      <View style={styles.actions}>
        <ActionButton
          label="Push Details"
          onPress={() => navigation.navigate('Details', { id: 1 })}
        />
        <ActionButton
          label="Push Details with a token param"
          onPress={() => navigation.navigate('Details', { id: 2, token: 'sk_live_secret' })}
        />
        <ActionButton label="Go to Settings" onPress={() => navigation.navigate('Settings')} />
        <ActionButton
          label="Navigate to Home (no change)"
          onPress={() => navigation.navigate('Home')}
        />
      </View>
      <Text style={styles.note}>
        Checkout opens a screen that carries a NavigationContainer of its own, handed over with the
        hook, while this root container stays found from context. Watch the route card switch
        between the two.
      </Text>
      <View style={styles.actions}>
        <ActionButton
          label="Open checkout (own container)"
          onPress={() => navigation.navigate('Checkout')}
        />
      </View>
      <Text style={styles.note}>
        The token is redacted by the `navigation.redact` hook in devtools.ts before the tab stores
        the move, so it never shows in the list, the card, the export or a crash report.
      </Text>
    </ScrollView>
  );
}

function DetailsScreen() {
  const navigation = useNavigation<Navigation>();
  const route = useRoute<RouteProp<DemoStack, 'Details'>>();
  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <Text style={styles.title}>Details #{route.params.id}</Text>
      <Text style={styles.note}>Params: {JSON.stringify(route.params)}</Text>
      <View style={styles.actions}>
        <ActionButton
          label="Push another Details"
          onPress={() => navigation.push('Details', { id: route.params.id + 1 })}
        />
        <ActionButton
          label="Replace with Settings"
          onPress={() => navigation.replace('Settings')}
        />
        <ActionButton
          label="Set params"
          onPress={() => navigation.setParams({ id: route.params.id * 10 })}
        />
        <ActionButton label="Go back" onPress={() => navigation.goBack()} />
        <ActionButton label="Pop to top" onPress={() => navigation.popToTop()} />
      </View>
    </ScrollView>
  );
}

function SettingsScreen() {
  const navigation = useNavigation<Navigation>();
  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <Text style={styles.title}>Settings</Text>
      <View style={styles.actions}>
        <ActionButton label="Go back" onPress={() => navigation.goBack()} />
        <ActionButton
          label="Reset to Home"
          onPress={() => navigation.reset({ index: 0, routes: [{ name: 'Home' }] })}
        />
      </View>
    </ScrollView>
  );
}

/**
 * Only the navigator. The container is at the app's root, in App.tsx, with the provider inside it,
 * which is what lets the Navigation tab find the container on its own: no ref, no hook. An app whose
 * provider sits above its container hands the container's ref over with `useDevtoolsNavigation`.
 */
export function NavigationDemo() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Details" component={DetailsScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="Checkout" component={CheckoutFlowDemo} />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  screen: {
    padding: 16,
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  note: {
    fontSize: 13,
    lineHeight: 18,
    color: '#666',
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
});
