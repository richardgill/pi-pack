import { rmSync } from "node:fs";
import type { LocalContext } from "~/context";
import type { VerboseFlags } from "~/lib/flags";
import {
  listManagedExtensions,
  resolveManagedExtensions,
  type ManagedExtension,
} from "~/lib/managed-extensions";
import { createPrompts, maybeCreatePrompts } from "~/lib/prompts";

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
  const targets = await chooseUninstallTargets(context, extensionNames);
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

  removeExtensionFolders(targets);
  printUninstallSummary(context, targets);
};

const chooseUninstallTargets = async (
  context: LocalContext,
  extensionNames: string[],
): Promise<ManagedExtension[]> => {
  if (extensionNames.length > 0) return resolveManagedExtensions(extensionNames);

  const prompts = maybeCreatePrompts(context);
  if (prompts === undefined) {
    throw new Error("Missing extension names. Pass extension names on the command line.");
  }

  return promptForUninstallTargets(prompts, listManagedExtensions());
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
  if (prompts === undefined) {
    throw new Error("Uninstall requires confirmation. Pass --yes to skip confirmation prompts.");
  }

  const confirmed = await prompts.confirm({
    message: `Permanently delete ${formatExtensionNames(targets)} including config.ts?`,
    initialValue: false,
  });

  if (prompts.isCancel(confirmed)) return false;
  return confirmed;
};

const removeExtensionFolders = (targets: ManagedExtension[]): void => {
  targets.forEach((target) => {
    rmSync(target.root, { recursive: true, force: true });
  });
};

const printUninstallWarning = (context: LocalContext, targets: ManagedExtension[]): void => {
  context.process.stdout.write(
    [
      "Will permanently delete:",
      ...targets.map((target) => `- ${target.extensionName}: ${target.root}`),
      "",
    ].join("\n"),
  );
};

const printUninstallSummary = (context: LocalContext, targets: ManagedExtension[]): void => {
  context.process.stdout.write(
    [...targets.map((target) => `Removed ${target.extensionName}: ${target.root}`), ""].join("\n"),
  );
};

const printNoUninstall = (context: LocalContext): void => {
  context.process.stdout.write("No extensions uninstalled.\n");
};

const formatExtensionNames = (targets: ManagedExtension[]): string =>
  targets.map((target) => target.extensionName).join(", ");
