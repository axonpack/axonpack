import { Text } from "react-native";

import type { LocalPreview } from "../../services/previews/local-previews.service";
import { font, formatSize } from "../../utils/preview-list/theme.util";
import { Card } from "./ui/card.ui";
import type { PreviewListTheme } from "./preview-list.types";

export function IncompatibleRow(props: {
  theme: PreviewListTheme;
  preview: LocalPreview;
}) {
  const { theme, preview } = props;
  return (
    <Card theme={theme}>
      <Text style={{ ...font(theme, "regular", 15), color: theme.text }}>
        {`${preview.entry.title} · ${formatSize(preview.entry.size)}`}
      </Text>
    </Card>
  );
}
