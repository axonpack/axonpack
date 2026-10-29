import { View } from "react-native";

import type { LocalPreview } from "../../services/previews/local-previews.service";
import type { GroupPosition } from "../../utils/preview-list/list-items.util";
import { BranchLine } from "./ui/branch-line.ui";
import { Card } from "./ui/card.ui";
import { EnvironmentChip } from "./ui/chip.ui";
import { ChipRow } from "./ui/chip-row.ui";
import { PublishedFacts } from "./ui/published-facts.ui";
import { TitleSubtitle } from "./ui/title-subtitle.ui";
import type { PreviewListLabels, PreviewListTheme } from "./preview-list.types";

/**
 * A download made for another native build, as a row of one grouped card. Nothing to do with it
 * but delete, which the section's Delete all does, so it only says what it is.
 */
export function IncompatibleRow(props: {
  theme: PreviewListTheme;
  labels: PreviewListLabels;
  preview: LocalPreview;
  position: GroupPosition;
  /** The time "2 minutes ago" counts from. */
  now: number;
}) {
  const { theme, labels } = props;
  const { entry } = props.preview;
  return (
    <Card
      theme={theme}
      position={props.position}
      testID={`incompatible-${props.preview.id}`}
    >
      <View style={{ gap: 6 }}>
        <TitleSubtitle theme={theme} title={entry.title} />
        {entry.branch ? (
          <BranchLine theme={theme} labels={labels} name={entry.branch} />
        ) : null}
      </View>
      {entry.environment ? (
        <ChipRow>
          <EnvironmentChip
            theme={theme}
            labels={labels}
            name={entry.environment}
          />
        </ChipRow>
      ) : null}
      <PublishedFacts
        theme={theme}
        labels={labels}
        entry={entry}
        now={props.now}
      />
    </Card>
  );
}
