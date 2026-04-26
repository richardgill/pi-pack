import { existsSync } from "node:fs";
import path from "node:path";
import { readJson } from "~/lib/json";
import type { PiPackPackageJson } from "~/lib/package-json";
import { assertSafeRelativePath } from "~/lib/path";

const readPackage = (packageJsonPath: string): PiPackPackageJson => {
  if (!existsSync(packageJsonPath)) return {};
  return readJson<PiPackPackageJson>(packageJsonPath);
};

export const readPiPackExtensionsFolder = (packageJsonPath: string): string | undefined => {
  const extensionsFolder = readPackage(packageJsonPath)["pi-pack"]?.["extensions-folder"];
  if (extensionsFolder === undefined) return undefined;
  assertSafeRelativePath(extensionsFolder, "pi-pack.extensions-folder");
  return extensionsFolder;
};

export const readRequiredPiPackExtensionsFolder = (packageJsonPath: string): string => {
  if (!existsSync(packageJsonPath)) throw new Error(`Missing package.json: ${packageJsonPath}`);

  const extensionsFolder = readPiPackExtensionsFolder(packageJsonPath);
  if (extensionsFolder !== undefined) return extensionsFolder;
  throw new Error(`Missing pi-pack.extensions-folder in ${packageJsonPath}`);
};

export const readPiPackExtensionsFolderFromPackageRoot = (
  packageRoot: string,
): string | undefined => readPiPackExtensionsFolder(path.join(packageRoot, "package.json"));

export const readPackageNameFromPackageRoot = (packageRoot: string): string =>
  readPackage(path.join(packageRoot, "package.json")).name ?? path.basename(packageRoot);
