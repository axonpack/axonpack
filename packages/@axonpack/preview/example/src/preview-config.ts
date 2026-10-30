import type { PreviewConfig } from "@axonpack/preview";

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
    // QA can add another computer's address in the list.
    allowCustomHosts: true,
    // Other computers running `preview start`, listed for everyone. The port is the registry's.
    hosts: [
      // "192.168.1.24",
    ],
  },
};
