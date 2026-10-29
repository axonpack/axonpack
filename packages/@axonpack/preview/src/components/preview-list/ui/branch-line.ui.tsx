import { Text, View } from "react-native";

import { BRANCH_TONE } from "../../../constants/preview-list/chip-tones.const";
import { toneColors } from "../../../utils/preview-list/color.util";
import { font } from "../../../utils/preview-list/theme.util";
import type {
  PreviewListLabels,
  PreviewListTheme,
} from "../preview-list.types";

/**
 * "Branch: name" set off like a quote, by a thin bar in the branch's tone. The whole name shows,
 * wrapping onto as many lines as it needs; a name with no spaces breaks mid-word.
 */
export function BranchLine(props: {
  theme: PreviewListTheme;
  labels: PreviewListLabels;
  name: string;
}) {
  const { theme, labels } = props;
  const color = toneColors(theme, BRANCH_TONE).text;
  return (
    <View
      accessible
      accessibilityLabel={`${labels.branch} ${props.name}`}
      style={{ flexDirection: "row", gap: 6 }}
    >
      <View
        testID="branch-bar"
        style={{
          width: 3,
          borderRadius: 1.5,
          alignSelf: "stretch",
          backgroundColor: color,
        }}
      />
      <Text style={{ flex: 1, ...font(theme, "regular", 13), color }}>
        {`${labels.branchPrefix} `}
        <Text style={font(theme, "medium", 13)}>{props.name}</Text>
      </Text>
    </View>
  );
}
