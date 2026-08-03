import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { StyleSheet, TouchableOpacity, type GestureResponderEvent } from 'react-native';

export type MaterialIconName = React.ComponentProps<typeof MaterialIcons>['name'];

export function IconButton({
  name,
  color,
  onPress,
  hitSlop = 8,
}: {
  name: MaterialIconName;
  color: string;
  onPress: (event: GestureResponderEvent) => void;
  hitSlop?: number;
}) {
  return (
    <TouchableOpacity onPress={onPress} hitSlop={hitSlop} style={styles.iconButton}>
      <MaterialIcons name={name} size={19} color={color} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  iconButton: {
    padding: 4,
  },
});
