import { useDevtoolsNavigation } from '@axonpack/expo-devtools';
import {
  createNavigationContainerRef,
  NavigationContainer,
  NavigationIndependentTree,
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import {
  createNativeStackNavigator,
  type NativeStackNavigationProp,
} from '@react-navigation/native-stack';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { ActionButton } from './ActionButton';

type FlowStack = {
  Cart: undefined;
  Address: undefined;
  Payment: { method: 'card' | 'cash' };
  Done: undefined;
};

type Navigation = NativeStackNavigationProp<FlowStack>;

const Flow = createNativeStackNavigator<FlowStack>();

/**
 * The third layout: a container of its own, inside the provider, where nothing above it can see it.
 * So its ref is handed over with the hook. The root container in App.tsx is found from context at
 * the same time, and the panel follows whichever of the two mounted last: this one while the
 * Checkout screen is open, the root again when it closes.
 */
const flowRef = createNavigationContainerRef<FlowStack>();

function CartScreen() {
  const navigation = useNavigation<Navigation>();
  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <Text style={styles.title}>Cart</Text>
      <Text style={styles.note}>
        This flow runs in a NavigationContainer of its own, inside the provider, handed over with
        useDevtoolsNavigation. The panel's route card now says so, and follows this container while
        the screen is open. Leave with the header's back button and the root container takes over
        again.
      </Text>
      <View style={styles.actions}>
        <ActionButton label="Continue to address" onPress={() => navigation.navigate('Address')} />
      </View>
    </ScrollView>
  );
}

function AddressScreen() {
  const navigation = useNavigation<Navigation>();
  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <Text style={styles.title}>Address</Text>
      <View style={styles.actions}>
        <ActionButton
          label="Pay by card"
          onPress={() => navigation.navigate('Payment', { method: 'card' })}
        />
        <ActionButton
          label="Pay cash"
          onPress={() => navigation.navigate('Payment', { method: 'cash' })}
        />
        <ActionButton label="Back to cart" onPress={() => navigation.goBack()} />
      </View>
    </ScrollView>
  );
}

function PaymentScreen() {
  const navigation = useNavigation<Navigation>();
  const route = useRoute<RouteProp<FlowStack, 'Payment'>>();
  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <Text style={styles.title}>Payment: {route.params.method}</Text>
      <View style={styles.actions}>
        <ActionButton
          label="Place order"
          onPress={() => navigation.reset({ index: 0, routes: [{ name: 'Done' }] })}
        />
        <ActionButton label="Change address" onPress={() => navigation.goBack()} />
      </View>
    </ScrollView>
  );
}

function DoneScreen() {
  const navigation = useNavigation<Navigation>();
  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <Text style={styles.title}>Order placed</Text>
      <Text style={styles.note}>
        That reset shows as a Reset row in the panel, in the warning colour, since it rewrote the
        stack rather than extending it.
      </Text>
      <View style={styles.actions}>
        <ActionButton
          label="Start over"
          onPress={() => navigation.reset({ index: 0, routes: [{ name: 'Cart' }] })}
        />
      </View>
    </ScrollView>
  );
}

export function CheckoutFlowDemo() {
  useDevtoolsNavigation(flowRef);

  return (
    // React Navigation refuses a container inside another unless it is declared independent.
    <NavigationIndependentTree>
      <NavigationContainer ref={flowRef}>
        <Flow.Navigator>
          <Flow.Screen name="Cart" component={CartScreen} />
          <Flow.Screen name="Address" component={AddressScreen} />
          <Flow.Screen name="Payment" component={PaymentScreen} />
          <Flow.Screen name="Done" component={DoneScreen} />
        </Flow.Navigator>
      </NavigationContainer>
    </NavigationIndependentTree>
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
