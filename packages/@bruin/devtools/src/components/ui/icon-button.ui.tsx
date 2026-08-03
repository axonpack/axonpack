import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { StyleSheet, TouchableOpacity } from 'react-native';

export type MaterialIconName = React.ComponentProps<typeof MaterialIcons>['name'];

export function IconButton({
  name,
  color,
  onPress,
}: {
  name: MaterialIconName;
  color: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity onPress={onPress} hitSlop={8} style={styles.iconButton}>
      <MaterialIcons name={name} size={19} color={color} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  iconButton: {
    padding: 4,
  },
});
