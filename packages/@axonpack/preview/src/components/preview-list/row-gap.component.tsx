import { View } from "react-native";

import type { ListItem } from "../../utils/preview-list/list-items.util";

/**
 * The room after a row, as the list's item separator. Gaps come from here, not the container's
 * `gap`, so the rows of a group touch while everything else keeps its 12.
 */
export function RowGap(props: { leadingItem?: ListItem }) {
  const item = props.leadingItem;
  const grouped =
    item !== undefined &&
    "position" in item &&
    (item.position === "first" || item.position === "middle");
  return grouped ? null : <View style={{ height: 12 }} />;
}
