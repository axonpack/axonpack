import type { PreviewConfig } from "@axonpack/preview";
import { Directory, Paths } from "expo-file-system";
import { Platform } from "react-native";

// From .env (see .env.example). Expo builds EXPO_PUBLIC_* values into the app, so only a read-only
// key may go there, never the write key.
// Without a URL the list says previews are not set up.
export const previewConfig: PreviewConfig = {
  enabled: true,
  s3Config: {
    url: process.env.EXPO_PUBLIC_PREVIEW_S3_URL as string,
    readAccessKeyId: process.env.EXPO_PUBLIC_PREVIEW_S3_READ_ACCESS_KEY_ID,
    readSecretAccessKey:
      process.env.EXPO_PUBLIC_PREVIEW_S3_READ_SECRET_ACCESS_KEY,
    region: process.env.EXPO_PUBLIC_PREVIEW_S3_REGION,
  },
  // Lists this app's Metro servers on your computer (debug builds only): `bunx preview start`.
  devPreviewServers: {
    enabled: true,
    // Other computers running `preview start`, listed for everyone. The port is the registry's.
    hosts: ["192.168.1.24"],
    // QA can add another computer's address in the list.
    allowCustomHosts: true,
  },
  // The app's own copy of each file set the config plugin's `files` option publishes. A preview
  // published with the set brings its own copy, and usePreviewFiles("content") then returns that.
  // expo-file-system has no folders on web, where the demo is not shown.
  files:
    Platform.OS === "web"
      ? {}
      : { content: { default: new Directory(Paths.document, "content").uri } },
};
