import { VersionCheckError } from "./errors";
import { reactNative } from "./runtime";
import { getStoreUrl } from "./get-store-url";
import type { GetStoreUrlOption } from "./types";

/** Opens the store page. On iOS, falls back to the https link if the itms-apps scheme is refused. */
export const openStore = async (
  option: GetStoreUrlOption & { storeUrl?: string } = {},
): Promise<void> => {
  const rn = reactNative();
  if (!rn)
    throw new VersionCheckError(
      "UNAVAILABLE",
      "react-native is not available.",
    );
  const url =
    option.storeUrl ?? (await getStoreUrl({ ...option, ignoreErrors: false }));
  try {
    await rn.Linking.openURL(url);
  } catch (error) {
    if (!url.startsWith("itms-apps://")) throw error;
    await rn.Linking.openURL(url.replace("itms-apps://", "https://"));
  }
};
