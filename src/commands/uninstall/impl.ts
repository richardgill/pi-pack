import { rmSync } from "node:fs";
import type { LocalContext } from "~/context";
import type { VerboseFlags } from "~/lib/flags";
import { colors } from "~/lib/colors";
import {
  listManagedExtensions,
  resolveManagedExtensions,
  type ManagedExtension,
} from "~/lib/managed-extensions";
import { canPrompt, createPrompts, maybeCreatePrompts } from "~/lib/prompts";
import { formatMissingRequiredInputs } from "~/lib/required-input";

export type UninstallFlags = VerboseFlags & {
  yes?: boolean;
};

export type UninstallArgs = string[];

type Prompts = ReturnType<typeof createPrompts>;

export const runUninstall = async (
  context: LocalContext,
  flags: UninstallFlags,
  extensionNames: string[],
): Promise<void> => {
  const availableTargets = listAvailableTargets(extensionNames);
  if (availableTargets.length === 0) {
    printNoUninstall(context);
    return;
  }

  assertUninstallInputsCanBeRead(context, flags, extensionNames);
  const targets = await chooseUninstallTargets(context, extensionNames, availableTargets);
  if (targets.length === 0) {
    printNoUninstall(context);
    return;
  }

  printUninstallWarning(context, targets);
  const confirmed = await confirmUninstall(context, flags, targets);
  if (!confirmed) {
    printNoUninstall(context);
    return;
  }

  removeExtensionDirs(targets);
  printUninstallSummary(context, targets);
};

const chooseUninstallTargets = async (
  context: LocalContext,
  extensionNames: string[],
  availableTargets: ManagedExtension[],
): Promise<ManagedExtension[]> => {
  if (extensionNames.length > 0) return availableTargets;

  const prompts = maybeCreatePrompts(context);
  if (prompts === undefined) throw new Error(formatMissingRequiredInputs(["<extension-name...>"]));

  return promptForUninstallTargets(prompts, availableTargets);
};

const promptForUninstallTargets = async (
  prompts: Prompts,
  extensions: ManagedExtension[],
): Promise<ManagedExtension[]> => {
  const selected = await prompts.multiselect({
    message: "Select pi-pack extensions to uninstall (space to select)",
    options: extensions.map((extension) => ({
      value: extension.extensionName,
      label: extension.extensionName,
      hint: extension.root,
    })),
    required: false,
  });

  if (prompts.isCancel(selected)) return [];
  return extensions.filter((extension) => selected.includes(extension.extensionName));
};

const confirmUninstall = async (
  context: LocalContext,
  flags: UninstallFlags,
  targets: ManagedExtension[],
): Promise<boolean> => {
  if (flags.yes === true) return true;

  const prompts = maybeCreatePrompts(context);
  if (prompts === undefined) throw new Error(formatMissingRequiredInputs(["--yes"]));

  const confirmed = await prompts.confirm({
    message: `Permanently delete ${formatExtensionNames(targets)} including config.ts?`,
    initialValue: false,
  });

  if (prompts.isCancel(confirmed)) return false;
  return confirmed;
};

const listAvailableTargets = (extensionNames: string[]): ManagedExtension[] => {
  if (extensionNames.length === 0) return listManagedExtensions();
  return resolveManagedExtensions(extensionNames);
};

const assertUninstallInputsCanBeRead = (
  context: LocalContext,
  flags: UninstallFlags,
  extensionNames: string[],
): void => {
  if (canPrompt(context)) return;
  const missingInputs = readMissingUninstallInputs(extensionNames, flags);
  if (missingInputs.length === 0) return;
  throw new Error(formatMissingRequiredInputs(missingInputs));
};

const readMissingUninstallInputs = (extensionNames: string[], flags: UninstallFlags): string[] =>
  [
    extensionNames.length === 0 ? "<extension-name...>" : undefined,
    flags.yes === true ? undefined : "--yes",
  ].filter((input): input is string => input !== undefined);

const removeExtensionDirs = (targets: ManagedExtension[]): void => {
  targets.forEach((target) => {
    rmSync(target.root, { recursive: true, force: true });
  });
};

const printUninstallWarning = (context: LocalContext, targets: ManagedExtension[]): void => {
  context.process.stdout.write(
    [
      colors.warning("Will permanently delete:"),
      ...targets.map(
        (target) => `- ${colors.failure(target.extensionName)}: ${colors.pathText(target.root)}`,
      ),
      "",
    ].join("\n"),
  );
};

const printUninstallSummary = (context: LocalContext, targets: ManagedExtension[]): void => {
  context.process.stdout.write(
    [
      ...targets.map(
        (target) =>
          `${colors.success("Removed")} ${colors.accent(target.extensionName)}: ${colors.pathText(target.root)}`,
      ),
      "",
    ].join("\n"),
  );
};

const printNoUninstall = (context: LocalContext): void => {
  context.process.stdout.write(`${colors.muted("No extensions uninstalled.")}\n`);
};

const formatExtensionNames = (targets: ManagedExtension[]): string =>
  targets.map((target) => target.extensionName).join(", ");
