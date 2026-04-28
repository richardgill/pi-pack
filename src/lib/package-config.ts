import { existsSync } from "node:fs";
import path from "node:path";
import { readJson } from "~/lib/json";
import type { PiPackPackageJson } from "~/lib/package-json";
import { assertSafeRelativePath } from "~/lib/path";

const readPackageJsonIfExists = (packageJsonPath: string): PiPackPackageJson | undefined => {
  if (!existsSync(packageJsonPath)) return undefined;
  return readJson<PiPackPackageJson>(packageJsonPath);
};

const readPackageJsonFromPackageRoot = (packageRoot: string): PiPackPackageJson | undefined =>
  readPackageJsonIfExists(path.join(packageRoot, "package.json"));

const readPackage = (packageJsonPath: string): PiPackPackageJson =>
  readPackageJsonIfExists(packageJsonPath) ?? {};

export const readPiPackExtensionsDir = (packageJsonPath: string): string | undefined => {
  const extensionsDir = readPackage(packageJsonPath)["pi-pack"]?.["extensions-dir"];
  if (extensionsDir === undefined) return undefined;
  assertSafeRelativePath(extensionsDir, "pi-pack.extensions-dir");
  return extensionsDir;
};

export const looksLikeVanillaPiExtension = (packageRoot: string): boolean => {
  const packageJson = readPackageJsonFromPackageRoot(packageRoot);
  if (packageJson === undefined) return false;

  return hasPiExtensions(packageJson) && !hasPiPackPackageConfig(packageJson);
};

const hasPiExtensions = (packageJson: PiPackPackageJson): boolean =>
  packageJson.pi?.extensions !== undefined || hasPiExtensionKeyword(packageJson);

const hasPiExtensionKeyword = (packageJson: PiPackPackageJson): boolean =>
  packageJson.keywords?.includes("pi-package") === true ||
  packageJson.keywords?.includes("pi-extension") === true;

const hasPiPackPackageConfig = (packageJson: PiPackPackageJson): boolean => {
  const piPackConfig = packageJson["pi-pack"];
  if (piPackConfig === undefined) return false;

  return (
    piPackConfig["default-config"] !== undefined ||
    piPackConfig["extensions-dir"] !== undefined ||
    piPackConfig.managed === true
  );
};

export const readRequiredPiPackExtensionsDir = (packageJsonPath: string): string => {
  if (!existsSync(packageJsonPath)) throw new Error(`Missing package.json: ${packageJsonPath}`);

  const extensionsDir = readPiPackExtensionsDir(packageJsonPath);
  if (extensionsDir !== undefined) return extensionsDir;
  throw new Error(`Missing pi-pack.extensions-dir in ${packageJsonPath}`);
};

export const readPiPackExtensionsDirFromPackageRoot = (packageRoot: string): string | undefined =>
  readPiPackExtensionsDir(path.join(packageRoot, "package.json"));

export const readPackageNameFromPackageRoot = (packageRoot: string): string =>
  readPackage(path.join(packageRoot, "package.json")).name ?? path.basename(packageRoot);
