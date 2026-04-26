import { existsSync } from "node:fs";
import path from "node:path";
import { readJson } from "~/lib/json";
import type { PiPackPackageJson } from "~/lib/package-json";
import { assertSafeRelativePath } from "~/lib/path";

const readPackage = (packageJsonPath: string): PiPackPackageJson => {
  if (!existsSync(packageJsonPath)) return {};
  return readJson<PiPackPackageJson>(packageJsonPath);
};

export const readPiPackExtensionsDir = (packageJsonPath: string): string | undefined => {
  const extensionsDir = readPackage(packageJsonPath)["pi-pack"]?.["extensions-dir"];
  if (extensionsDir === undefined) return undefined;
  assertSafeRelativePath(extensionsDir, "pi-pack.extensions-dir");
  return extensionsDir;
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
