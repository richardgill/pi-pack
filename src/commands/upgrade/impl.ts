import type { LocalContext } from "~/context";
import type { VerboseFlags } from "~/lib/command";
import { upgradeTargets } from "./runner";
import { printUpgradeFailures, printUpgradeSummary } from "./summary";
import { resolveUpgradeTargets } from "./targets";

export type UpgradeFlags = VerboseFlags & {
  bump?: boolean;
};

export type UpgradeArgs = string[];

export const runUpgrade = async (
  context: LocalContext,
  flags: UpgradeFlags,
  extensionNames: string[],
): Promise<void> => {
  const targets = resolveUpgradeTargets(extensionNames);
  const { results, failures } = await upgradeTargets(targets, { bump: flags.bump ?? false });
  printUpgradeSummary(context, results);
  printUpgradeFailures(context, failures);
  if (failures.length > 0) {
    throw new Error(`Failed to upgrade ${failures.length} extension(s).`);
  }
};
