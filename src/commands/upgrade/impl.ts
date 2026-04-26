import type { LocalContext } from "~/context";
import type { VerboseFlags } from "~/lib/flags";
import {
  listManagedExtensions,
  type ManagedExtension,
  resolveManagedExtensions,
} from "~/lib/managed-extensions";
import { resolvePiExtensionsDir } from "~/lib/pi";
import { upgradeExtensions } from "./runner";
import { printUpgradeFailures, printUpgradeSummary } from "./summary";

export type UpgradeFlags = VerboseFlags & {
  bump?: boolean;
};

export type UpgradeArgs = string[];

export const runUpgrade = async (
  context: LocalContext,
  flags: UpgradeFlags,
  extensionNames: string[],
): Promise<void> => {
  const extensions = resolveExtensions(extensionNames);
  const { results, failures } = await upgradeExtensions(extensions, { bump: flags.bump ?? false });
  printUpgradeSummary(context, results);
  printUpgradeFailures(context, failures);
  if (failures.length > 0) {
    throw new Error(`Failed to upgrade ${failures.length} extension(s).`);
  }
};

const resolveExtensions = (extensionNames: string[]): ManagedExtension[] => {
  const extensions =
    extensionNames.length === 0
      ? listManagedExtensions()
      : resolveManagedExtensions(extensionNames);
  if (extensions.length === 0) {
    throw new Error(`No installed extensions found at ${resolvePiExtensionsDir()}`);
  }
  return extensions;
};
