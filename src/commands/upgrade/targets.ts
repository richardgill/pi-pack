import { listManagedExtensions, resolveManagedExtensions } from "~/lib/managed-extensions";

export type UpgradeTarget = {
  extensionName: string;
  root: string;
};

export const resolveUpgradeTargets = (extensionNames: string[]): UpgradeTarget[] => {
  if (extensionNames.length === 0) return listManagedExtensions();
  return resolveManagedExtensions(extensionNames);
};
