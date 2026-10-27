import type { PreviewConfig } from "@axonpack/preview";

// From .env (see .env.example). Expo builds EXPO_PUBLIC_* values into the app, so only a read-only
// key may go there, never the write key.
export const previewConfig: PreviewConfig = {
  enabled: true,
  url: process.env.EXPO_PUBLIC_PREVIEW_S3_URL ?? "",
  readAccessKeyId: process.env.EXPO_PUBLIC_PREVIEW_S3_READ_ACCESS_KEY_ID,
  readSecretAccessKey:
    process.env.EXPO_PUBLIC_PREVIEW_S3_READ_SECRET_ACCESS_KEY,
  region: process.env.EXPO_PUBLIC_PREVIEW_S3_REGION,
  // Lists this app's Metro servers on your computer (debug builds only): `bunx preview start`.
  devPreviewServers: true,
};
