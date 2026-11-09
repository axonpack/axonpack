import { usePreviewFiles } from "@axonpack/preview";
import { File } from "expo-file-system";
import { useEffect, useState } from "react";
import { StyleSheet } from "react-native";

import { ThemedText } from "./themed-text";
import { ThemedView } from "./themed-view";

import { Spacing } from "@/constants/theme";

import builtIn from "../../web/content.json";

/**
 * Reads web/content.json from whichever copy goes with the running bundle: a preview's own when it
 * was published with the `content` set, else the app's default copy.
 */
export function FilesDemo() {
  const files = usePreviewFiles("content");
  const [message, setMessage] = useState("");
  useEffect(() => {
    const file = new File(`${files.uri}content.json`);
    (async () => {
      // A real app embeds its default copy in the native build. This example has no native folder
      // of its own, so the first start writes the copy from the bundle instead.
      if (files.source === "default" && !file.exists) {
        file.create({ intermediates: true });
        await file.write(JSON.stringify(builtIn));
      }
      setMessage(JSON.parse(await file.text()).message);
    })().catch((error: unknown) => setMessage(String(error)));
  }, [files.uri, files.source]);

  return (
    <ThemedView type="backgroundElement" style={styles.box}>
      <ThemedText type="smallBold">web/content.json</ThemedText>
      <ThemedText testID="files-message">{message}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {files.source === "preview"
          ? `From preview ${files.previewId}`
          : "Default copy"}
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  box: {
    gap: Spacing.one,
    alignSelf: "stretch",
    padding: Spacing.three,
    borderRadius: Spacing.four,
  },
});
