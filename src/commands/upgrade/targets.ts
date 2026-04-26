import {
  listManagedExtensions,
  type ManagedExtension,
  resolveManagedExtensions,
} from "~/lib/managed-extensions";
import { resolvePiExtensionsDir } from "~/lib/pi";

export const resolveUpgradeTargets = (extensionNames: string[]): ManagedExtension[] => {
  const targets =
    extensionNames.length === 0
      ? listManagedExtensions()
      : resolveManagedExtensions(extensionNames);
  if (targets.length === 0) {
    throw new Error(`No installed extensions found at ${resolvePiExtensionsDir()}`);
  }
  return targets;
};
