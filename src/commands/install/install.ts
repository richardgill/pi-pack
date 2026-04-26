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

const DEFAULT_CONFIG_PATH = "./src/default-config.ts";

export const installExtension = async (install: ResolvedInstall): Promise<InstallResult> => {
  assertCanInstall(install);

  const tmpInstall = createTmpInstall(install);
  try {
    await pnpmAdd(tmpInstall.tmpRoot, tmpInstall.pnpmDependency);
    const result = copyDefaultConfigToInstalledConfig(tmpInstall);
    finalizeInstall(tmpInstall);
    return result;
  } finally {
    cleanupTmpInstall(tmpInstall);
  }
};

const assertCanInstall = (install: ResolvedInstall): void => {
  if (!existsSync(install.absInstallDir)) return;
  if (readdirSync(install.absInstallDir).length === 0) return;
  throw new Error(`Extension already exists: ${install.absInstallDir}. Delete it manually first.`);
};

const createTmpInstall = (install: ResolvedInstall): TmpInstall => {
  mkdirSync(install.piExtensionsDir, { recursive: true });
  const tmpRoot = mkdtempSync(path.join(install.piExtensionsDir, ".pi-pack-install-"));
  writeJson(path.join(tmpRoot, "package.json"), INSTALLED_EXTENSION_PACKAGE_JSON);
  return { ...install, tmpRoot };
};

const copyDefaultConfigToInstalledConfig = (install: TmpInstall): InstallResult => {
  const packageRoot = path.join(install.tmpRoot, "node_modules", install.packageName);
  const packageJson = readJson<PiPackPackageJson>(path.join(packageRoot, "package.json"));
  const piPackConfig = packageJson["pi-pack"];
  const defaultConfig = piPackConfig?.["default-config"] ?? DEFAULT_CONFIG_PATH;
  const sourcePath = resolveDefaultConfigSource(packageRoot, defaultConfig);

  copyFileSync(sourcePath, path.join(install.tmpRoot, INSTALLED_EXTENSION_CONFIG_FILE));
  return { requiresConfigEdit: piPackConfig?.["requires-config-edit"] ?? true };
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

const finalizeInstall = (install: TmpInstall): void => {
  mkdirSync(path.dirname(install.absInstallDir), { recursive: true });
  renameSync(install.tmpRoot, install.absInstallDir);
};

const cleanupTmpInstall = (install: TmpInstall): void => {
  rmSync(install.tmpRoot, { recursive: true, force: true });
};
