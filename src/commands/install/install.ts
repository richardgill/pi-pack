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

type InstalledExtensionPackage = {
  packageRootPath: string;
  piPackConfig: PiPackPackageJson["pi-pack"];
};

const DEFAULT_CONFIG_PATH = "./src/default-config.ts";

export const installExtension = async (install: ResolvedInstall): Promise<InstallResult> => {
  assertInstallDirIsAvailable(install);

  // Install into ~/.pi/agent/extensions/.pi-pack-install-* first.
  // On success, move it to the final extension directory; on failure, clean it up.
  return withTmpInstall(install.piExtensionsDir, async (tmpRoot) => {
    return installIntoTmpDir({ ...install, tmpRoot });
  });
};

const assertInstallDirIsAvailable = (install: ResolvedInstall): void => {
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

const installIntoTmpDir = async (tmpInstall: TmpInstall): Promise<InstallResult> => {
  writeJson(path.join(tmpInstall.tmpRoot, "package.json"), INSTALLED_EXTENSION_PACKAGE_JSON);
  await pnpmAdd(tmpInstall.tmpRoot, tmpInstall.pnpmDependency);
  const installedPackage = readInstalledPackage(tmpInstall);
  installDefaultConfig(tmpInstall, installedPackage);
  moveTmpInstallIntoPlace(tmpInstall);
  return {
    requiresConfigEdit: installedPackage.piPackConfig?.["requires-config-edit"] ?? true,
  };
};

const readInstalledPackage = (install: TmpInstall): InstalledExtensionPackage => {
  const packageRootPath = getInstalledPackageRootPath(install);
  const packageJson = readJson<PiPackPackageJson>(path.join(packageRootPath, "package.json"));

  return { packageRootPath, piPackConfig: packageJson["pi-pack"] };
};

const getInstalledPackageRootPath = (install: TmpInstall): string => {
  return path.join(install.tmpRoot, "node_modules", install.packageName);
};

const installDefaultConfig = (
  install: TmpInstall,
  installedPackage: InstalledExtensionPackage,
): void => {
  const defaultConfig = getDefaultConfigPath(installedPackage.piPackConfig);
  const defaultConfigSourcePath = resolveDefaultConfigSourcePath(
    installedPackage.packageRootPath,
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

const resolveDefaultConfigSourcePath = (packageRoot: string, defaultConfig: string): string => {
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
  if (lstatSync(sourcePath).isSymbolicLink() || !statSync(sourcePath).isFile()) {
    throw new Error(`Default config must be a regular file inside the package: ${defaultConfig}`);
  }
};

const assertDefaultConfigIsInsidePackage = (
  packageRoot: string,
  sourcePath: string,
  defaultConfig: string,
): void => {
  const relativePath = path.relative(realpathSync(packageRoot), realpathSync(sourcePath));
  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    throw new Error(`Default config must be a regular file inside the package: ${defaultConfig}`);
  }
};

const moveTmpInstallIntoPlace = (install: TmpInstall): void => {
  mkdirSync(path.dirname(install.absInstallDir), { recursive: true });
  renameSync(install.tmpRoot, install.absInstallDir);
};
