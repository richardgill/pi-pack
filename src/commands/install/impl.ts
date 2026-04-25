import path from "node:path";
import type { LocalContext } from "~/context";
import type { VerboseFlags } from "~/lib/command";
import { INSTALLED_EXTENSION_CONFIG_FILE } from "~/lib/package-json";
import { assertSafeExtensionName, resolvePiExtensionsRoot } from "~/lib/pi";
import { inferPackageName } from "~/lib/pnpm";
import { installExtension, type InstallResult, type ResolvedInstall } from "./install";
import { toPnpmDependency } from "./sources";

export type InstallFlags = VerboseFlags & {
  extension?: string;
  as?: string;
};

export type InstallArgs = [source: string];

export const runInstall = async (
  context: LocalContext,
  flags: InstallFlags,
  source: string,
): Promise<void> => {
  const install = await resolveInstall(context, flags, source);

  const result = await installExtension(install);

  printInstallSummary(context, install, result);
};

const resolveInstall = async (
  context: LocalContext,
  flags: InstallFlags,
  source: string,
): Promise<ResolvedInstall> => {
  const dependency = await resolveDependency(context, flags, source);
  const packageName = await inferPackageName(dependency);
  const extensionName = readExtensionName(flags, packageName);
  const piExtensionsFolder = resolvePiExtensionsRoot();

  return {
    dependency,
    packageName,
    extensionName,
    piExtensionsFolder,
    targetRoot: path.join(piExtensionsFolder, extensionName),
  };
};

const resolveDependency = async (
  context: LocalContext,
  flags: InstallFlags,
  source: string,
): Promise<string> => {
  if (flags.extension !== undefined) assertSafeExtensionName(flags.extension);
  return toPnpmDependency(context.cwd, source, flags.extension);
};

const printInstallSummary = (
  context: LocalContext,
  install: ResolvedInstall,
  result: InstallResult,
): void => {
  const configInstructions = result.requiresConfigEdit
    ? ["", `Edit config: ${path.join(install.targetRoot, INSTALLED_EXTENSION_CONFIG_FILE)}`]
    : [];

  context.process.stdout.write(
    [
      `Installed pi extension: ${install.extensionName}`,
      `Location: ${install.targetRoot}`,
      ...configInstructions,
      "",
    ].join("\n"),
  );
};

const readExtensionName = (flags: InstallFlags, packageName: string): string => {
  const extensionName = flags.as ?? packageName;
  assertSafeExtensionName(extensionName, "Use --as to choose a different name.");
  return extensionName;
};
