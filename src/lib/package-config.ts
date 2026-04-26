import { existsSync } from "node:fs";
import { readJson } from "~/lib/json";
import type { PiPackPackageJson } from "~/lib/package-json";
import { assertSafeRelativePath } from "~/lib/path";

export const readPackage = (packageJsonPath: string): PiPackPackageJson => {
  if (!existsSync(packageJsonPath)) return {};
  return readJson<PiPackPackageJson>(packageJsonPath);
};

export const readConfiguredExtensionsFolder = (packageJsonPath: string): string | undefined => {
  const extensionsFolder = readPackage(packageJsonPath)["pi-pack"]?.["extensions-folder"];
  if (extensionsFolder === undefined) return undefined;
  assertSafeRelativePath(extensionsFolder, "pi-pack.extensions-folder");
  return extensionsFolder;
};

export const readRequiredConfiguredExtensionsFolder = (packageJsonPath: string): string => {
  if (!existsSync(packageJsonPath)) throw new Error(`Missing package.json: ${packageJsonPath}`);

  const extensionsFolder = readConfiguredExtensionsFolder(packageJsonPath);
  if (extensionsFolder !== undefined) return extensionsFolder;
  throw new Error(`Missing pi-pack.extensions-folder in ${packageJsonPath}`);
};
