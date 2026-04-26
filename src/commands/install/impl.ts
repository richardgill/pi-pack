import path from "node:path";
import type { LocalContext } from "~/context";
import type { VerboseFlags } from "~/lib/flags";
import { INSTALLED_EXTENSION_CONFIG_FILE } from "~/lib/package-json";
import { assertSafeExtensionName, resolvePiExtensionsFolder } from "~/lib/pi";
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
  const pnpmDependency = await resolveDependency(context, flags, source);
  const packageName = await inferPackageName(pnpmDependency);
  const installAs = flags.as ?? packageName;
  assertSafeExtensionName(installAs, "Use --as to choose a different name.");
  const piExtensionsFolder = resolvePiExtensionsFolder();

  return {
    pnpmDependency,
    packageName,
    installAs,
    piExtensionsFolder,
    absInstallFolder: path.join(piExtensionsFolder, installAs),
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
    ? ["", `Edit config: ${path.join(install.absInstallFolder, INSTALLED_EXTENSION_CONFIG_FILE)}`]
    : [];

  context.process.stdout.write(
    [
      `Installed pi extension: ${install.installAs}`,
      `Location: ${install.absInstallFolder}`,
      ...configInstructions,
      "",
    ].join("\n"),
  );
};
