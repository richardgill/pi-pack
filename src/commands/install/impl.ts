import path from "node:path";
import type { LocalContext } from "~/context";
import type { VerboseFlags } from "~/lib/flags";
import { colors } from "~/lib/colors";
import { INSTALLED_EXTENSION_CONFIG_FILE } from "~/lib/package-json";
import { readInstallSourceExtensionNames, toPnpmDependency } from "~/lib/install-source";
import { assertSafeExtensionName, resolvePiExtensionsDir } from "~/lib/pi";
import { resolvePackageNameFromPnpmSource } from "~/lib/pnpm";
import { createSpinner } from "~/lib/prompts";
import { installExtension, type InstallResult, type ResolvedInstall } from "./install";

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

  const result = await runInstallExtension(context, install);

  printInstallSummary(context, install, result);
};

const runInstallExtension = async (
  context: LocalContext,
  install: ResolvedInstall,
): Promise<InstallResult> => {
  const spinner = createSpinner(context);
  spinner.start(`Installing pi extension: ${colors.accent(install.installAs)}`);
  try {
    const result = await installExtension(install);
    spinner.stop(
      `${colors.success("Installed")} pi extension: ${colors.accent(install.installAs)}`,
    );
    return result;
  } catch (error) {
    spinner.stop(
      `${colors.failure("Failed")} to install pi extension: ${colors.accent(install.installAs)}`,
    );
    throw error;
  }
};

const resolveInstall = async (
  context: LocalContext,
  flags: InstallFlags,
  source: string,
): Promise<ResolvedInstall> => {
  if (flags.extension !== undefined) {
    assertSafeExtensionName(flags.extension);
  }
  await assertExtensionSelectedForMonorepo(context.cwd, source, flags.extension);
  const pnpmDependency = await toPnpmDependency(context.cwd, source, flags.extension);
  const packageName = await resolvePackageNameFromPnpmSource(pnpmDependency);
  const installAs = flags.as ?? packageName;
  assertSafeExtensionName(installAs, "Use --as to choose a different name.");
  const piExtensionsDir = resolvePiExtensionsDir();

  return {
    pnpmDependency,
    packageName,
    installAs,
    piExtensionsDir,
    absInstallDir: path.join(piExtensionsDir, installAs),
  };
};

const assertExtensionSelectedForMonorepo = async (
  cwd: string,
  source: string,
  extensionName?: string,
): Promise<void> => {
  if (extensionName !== undefined) return;
  const extensionNames = await readInstallSourceExtensionNames(cwd, source);
  if (extensionNames === undefined || extensionNames.length === 0) return;
  throw new Error(formatExtensionSuggestions(source, extensionNames));
};

const formatExtensionSuggestions = (source: string, extensionNames: string[]): string =>
  [
    "Did you mean:",
    "",
    ...extensionNames.map(
      (extensionName) => `pi-pack install ${source} --extension ${extensionName}`,
    ),
  ].join("\n");

const printInstallSummary = (
  context: LocalContext,
  install: ResolvedInstall,
  result: InstallResult,
): void => {
  const configPath = path.join(install.absInstallDir, INSTALLED_EXTENSION_CONFIG_FILE);
  const configInstructions = result.requiresConfigEdit
    ? ["", `${colors.warning("Edit config:")} ${colors.pathText(configPath)}`]
    : [];

  context.process.stdout.write(
    [
      `${colors.success("Installed")} pi extension: ${colors.accent(install.installAs)}`,
      `${colors.label("Location:")} ${colors.pathText(install.absInstallDir)}`,
      ...configInstructions,
      "",
    ].join("\n"),
  );
};
