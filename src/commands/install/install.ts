import {
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  realpathSync,
  renameSync,
  rmSync,
  statSync,
} from "node:fs";
import path from "node:path";
import { readJson, writeJson } from "~/lib/json";
import {
  INSTALLED_EXTENSION_CONFIG_FILE,
  INSTALLED_EXTENSION_PACKAGE_JSON,
  type PiPackPackageJson,
} from "~/lib/package-json";
import { assertSafeRelativePath } from "~/lib/path";
import { pnpmAdd } from "~/lib/pnpm";

export type ResolvedInstall = {
  pnpmDependency: string;
  packageName: string;
  installAs: string;
  piExtensionsDir: string;
  absInstallDir: string;
};

export type TmpInstall = ResolvedInstall & {
  tmpRoot: string;
};

export type InstallResult = {
  requiresConfigEdit: boolean;
};

type InstalledPackage = {
  packageRoot: string;
  piPackConfig: PiPackPackageJson["pi-pack"];
};

const DEFAULT_CONFIG_PATH = "./src/default-config.ts";

export const installExtension = async (install: ResolvedInstall): Promise<InstallResult> => {
  assertInstallDirDoesNotExist(install);

  // Install into ~/.pi/agent/extensions/.pi-pack-install-* first.
  // On success, move it to the final extension directory; on failure, clean it up.
  return withTmpInstall(install.piExtensionsDir, async (tmpRoot) => {
    const tmpInstall = { ...install, tmpRoot };
    writeJson(path.join(tmpInstall.tmpRoot, "package.json"), INSTALLED_EXTENSION_PACKAGE_JSON);
    await pnpmAdd(tmpInstall.tmpRoot, tmpInstall.pnpmDependency);
    const installedPackage = readInstalledPackage(tmpInstall);
    installDefaultConfig(tmpInstall, installedPackage);
    moveTmpInstallIntoPlace(tmpInstall);
    return {
      requiresConfigEdit: installedPackage.piPackConfig?.["requires-config-edit"] ?? true,
    };
  });
};

const assertInstallDirDoesNotExist = (install: ResolvedInstall): void => {
  const installDirExists = existsSync(install.absInstallDir);
  const installDirHasFiles = installDirExists && readdirSync(install.absInstallDir).length > 0;

  if (installDirHasFiles) {
    throw new Error(
      `Extension already exists: ${install.absInstallDir}. Delete it manually first.`,
    );
  }
};

const withTmpInstall = async <T>(
  piExtensionsDir: string,
  callback: (tmpRoot: string) => Promise<T>,
): Promise<T> => {
  mkdirSync(piExtensionsDir, { recursive: true });
  const tmpRoot = mkdtempSync(path.join(piExtensionsDir, ".pi-pack-install-"));

  try {
    return await callback(tmpRoot);
  } finally {
    rmSync(tmpRoot, { recursive: true, force: true });
  }
};

const readInstalledPackage = (install: TmpInstall): InstalledPackage => {
  const packageRoot = getInstalledPackageRoot(install);
  const packageJson = readJson<PiPackPackageJson>(path.join(packageRoot, "package.json"));

  return { packageRoot, piPackConfig: packageJson["pi-pack"] };
};

const getInstalledPackageRoot = (install: TmpInstall): string => {
  return path.join(install.tmpRoot, "node_modules", install.packageName);
};

const installDefaultConfig = (install: TmpInstall, installedPackage: InstalledPackage): void => {
  const defaultConfig = getDefaultConfigPath(installedPackage.piPackConfig);
  const defaultConfigSourcePath = resolveDefaultConfigSource(
    installedPackage.packageRoot,
    defaultConfig,
  );

  copyFileSync(defaultConfigSourcePath, getInstalledConfigPath(install));
};

const getDefaultConfigPath = (piPackConfig: PiPackPackageJson["pi-pack"]): string => {
  return piPackConfig?.["default-config"] ?? DEFAULT_CONFIG_PATH;
};

const getInstalledConfigPath = (install: TmpInstall): string => {
  return path.join(install.tmpRoot, INSTALLED_EXTENSION_CONFIG_FILE);
};

const resolveDefaultConfigSource = (packageRoot: string, defaultConfig: string): string => {
  const relativeConfig = stripLeadingDotSlash(defaultConfig);
  assertSafeRelativePath(relativeConfig, "pi-pack.default-config");

  const sourcePath = path.resolve(packageRoot, relativeConfig);
  if (!existsSync(sourcePath)) throw new Error(`Could not find default config: ${defaultConfig}`);

  assertDefaultConfigIsRegularFile(sourcePath, defaultConfig);
  assertDefaultConfigIsInsidePackage(packageRoot, sourcePath, defaultConfig);
  return sourcePath;
};

const stripLeadingDotSlash = (value: string): string => {
  if (value.startsWith("./")) return value.slice(2);
  return value;
};

const assertDefaultConfigIsRegularFile = (sourcePath: string, defaultConfig: string): void => {
  if (lstatSync(sourcePath).isSymbolicLink()) {
    throw new Error(`Default config must be a regular file inside the package: ${defaultConfig}`);
  }
  if (statSync(sourcePath).isFile()) return;
  throw new Error(`Default config must be a regular file inside the package: ${defaultConfig}`);
};

const assertDefaultConfigIsInsidePackage = (
  packageRoot: string,
  sourcePath: string,
  defaultConfig: string,
): void => {
  const relativePath = path.relative(realpathSync(packageRoot), realpathSync(sourcePath));
  if (relativePath !== "" && !relativePath.startsWith("..") && !path.isAbsolute(relativePath))
    return;
  throw new Error(`Default config must be a regular file inside the package: ${defaultConfig}`);
};

const moveTmpInstallIntoPlace = (install: TmpInstall): void => {
  mkdirSync(path.dirname(install.absInstallDir), { recursive: true });
  renameSync(install.tmpRoot, install.absInstallDir);
};
