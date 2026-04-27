import type { LocalContext } from "~/context";
import type { VerboseFlags } from "~/lib/flags";
import { colors } from "~/lib/colors";
import {
  listManagedExtensions,
  type ManagedExtension,
  resolveManagedExtensions,
} from "~/lib/managed-extensions";
import { resolvePiExtensionsDir } from "~/lib/pi";
import { createSpinner } from "~/lib/prompts";
import {
  upgradeExtension,
  type UpgradeFailure,
  type UpgradeOptions,
  type UpgradeResult,
} from "./runner";
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
  const { results, failures } = await runUpgrades(context, extensions, {
    bump: flags.bump ?? false,
  });
  printUpgradeSummary(context, results);
  printUpgradeFailures(context, failures);
  if (failures.length > 0) {
    throw new Error(`Failed to upgrade ${failures.length} extension(s).`);
  }
};

const runUpgrades = async (
  context: LocalContext,
  extensions: ManagedExtension[],
  options: UpgradeOptions,
): Promise<{ results: UpgradeResult[]; failures: UpgradeFailure[] }> => {
  const results: UpgradeResult[] = [];
  const failures: UpgradeFailure[] = [];
  for (const extension of extensions) {
    const spinner = createSpinner(context);
    spinner.start(`Upgrading ${colors.accent(extension.extensionName)}`);
    try {
      const result = await upgradeExtension(extension, options);
      spinner.stop(
        `${formatUpgradeStatus(result.changed)} ${colors.accent(extension.extensionName)}`,
      );
      results.push(result);
    } catch (error) {
      spinner.stop(
        `${colors.failure("Failed")} to upgrade ${colors.accent(extension.extensionName)}`,
      );
      failures.push({ ...extension, error });
    }
  }
  return { results, failures };
};

const formatUpgradeStatus = (changed: boolean): string =>
  changed ? colors.success("Upgraded") : colors.muted("Checked");

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
