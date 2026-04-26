import { listManagedExtensions, resolveManagedExtensions } from "~/lib/managed-extensions";
import { resolvePiExtensionsFolder } from "~/lib/pi";

export type UpgradeTarget = {
  extensionName: string;
  root: string;
};

export const resolveUpgradeTargets = (extensionNames: string[]): UpgradeTarget[] => {
  const targets = readUpgradeTargets(extensionNames);
  if (targets.length > 0) return targets;
  throw new Error(`No installed extensions found at ${resolvePiExtensionsFolder()}`);
};

const readUpgradeTargets = (extensionNames: string[]): UpgradeTarget[] => {
  if (extensionNames.length === 0) return listManagedExtensions();
  return resolveManagedExtensions(extensionNames);
};
