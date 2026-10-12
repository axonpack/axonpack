import { VersionInfoUnavailableError } from "./errors";

type ExpoUpdates = {
  isEnabled: boolean;
  checkForUpdateAsync: () => Promise<{ isAvailable: boolean }>;
  fetchUpdateAsync: () => Promise<{ isNew?: boolean }>;
  reloadAsync: () => Promise<void>;
};

const load = (): ExpoUpdates | undefined => {
  try {
    return require("expo-updates") as ExpoUpdates;
  } catch {
    return undefined;
  }
};

const updates = (): ExpoUpdates => {
  const mod = load();
  if (!mod)
    throw new VersionInfoUnavailableError("expo-updates is not installed.");
  return mod;
};

/** Is there an over-the-air bundle waiting? False when expo-updates is missing or off (dev builds). */
export const checkOtaUpdate = async (): Promise<boolean> => {
  const mod = load();
  if (!mod?.isEnabled) return false;
  return (await mod.checkForUpdateAsync()).isAvailable;
};

/** Downloads the waiting bundle and restarts into it. */
export const applyOtaUpdate = async (): Promise<void> => {
  const mod = updates();
  await mod.fetchUpdateAsync();
  await mod.reloadAsync();
};
