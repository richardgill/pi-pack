import { existsSync, readdirSync } from "node:fs";
import type { Dirent } from "node:fs";
import path from "node:path";
import { readJson } from "~/lib/json";
import type { PiPackPackageJson } from "~/lib/package-json";
import { resolveExtensionDir, resolvePiExtensionsDir } from "~/lib/pi";

// pi extensions are "managed" by pi-pack if their package.json has:
// { "pi-pack": { "managed": true } }

export type ManagedExtension = {
  extensionName: string;
  root: string;
};

export const listManagedExtensions = (): ManagedExtension[] => {
  const extensionsRoot = resolvePiExtensionsDir();
  if (!existsSync(extensionsRoot)) return [];

  return readdirSync(extensionsRoot, { withFileTypes: true })
    .filter((entry) => isManagedExtensionEntry(extensionsRoot, entry))
    .map((entry) => toManagedExtension(entry.name, path.join(extensionsRoot, entry.name)))
    .sort((a, b) => a.extensionName.localeCompare(b.extensionName));
};

export const resolveManagedExtensions = (extensionNames: string[]): ManagedExtension[] =>
  extensionNames.map(resolveManagedExtension);

const assertManagedExtensionRoot = (root: string): void => {
  if (isManagedExtensionRoot(root)) return;
  throw new Error(`Installed pi-pack extension not found: ${root}`);
};

const isManagedExtensionRoot = (root: string): boolean => {
  const packageJsonPath = path.join(root, "package.json");
  return (
    existsSync(packageJsonPath) &&
    readJson<PiPackPackageJson>(packageJsonPath)["pi-pack"]?.managed === true
  );
};

const resolveManagedExtension = (extensionName: string): ManagedExtension =>
  toManagedExtension(extensionName, resolveExtensionDir(extensionName));

const toManagedExtension = (extensionName: string, root: string): ManagedExtension => {
  assertManagedExtensionRoot(root);
  return { extensionName, root };
};

const isManagedExtensionEntry = (extensionsRoot: string, entry: Dirent): boolean =>
  entry.isDirectory() &&
  !entry.name.startsWith(".") &&
  isManagedExtensionRoot(path.join(extensionsRoot, entry.name));
