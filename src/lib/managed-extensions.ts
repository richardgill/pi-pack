import { existsSync, readdirSync } from "node:fs";
import type { Dirent } from "node:fs";
import path from "node:path";
import { readJson } from "~/lib/json";
import type { PackageJson } from "~/lib/package-json";
import { resolveExtensionRoot, resolvePiExtensionsRoot } from "~/lib/pi";

// pi extensions are "managed" by pi-pack if their package.json has:
// { "pi-pack": { "managed": true } }

export type ManagedExtension = {
  extensionName: string;
  root: string;
};

export const listManagedExtensions = (): ManagedExtension[] => {
  const extensionsRoot = resolvePiExtensionsRoot();
  if (!existsSync(extensionsRoot)) {
    throw new Error(`No installed extensions found at ${extensionsRoot}`);
  }

  const extensions = readdirSync(extensionsRoot, { withFileTypes: true })
    .filter((entry) => isManagedExtensionEntry(extensionsRoot, entry))
    .map((entry) => toManagedExtension(entry.name, path.join(extensionsRoot, entry.name)))
    .sort((a, b) => a.extensionName.localeCompare(b.extensionName));

  if (extensions.length > 0) return extensions;
  throw new Error(`No installed extensions found at ${extensionsRoot}`);
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
    readJson<PackageJson>(packageJsonPath)["pi-pack"]?.managed === true
  );
};

const resolveManagedExtension = (extensionName: string): ManagedExtension =>
  toManagedExtension(extensionName, resolveExtensionRoot(extensionName));

const toManagedExtension = (extensionName: string, root: string): ManagedExtension => {
  assertManagedExtensionRoot(root);
  return { extensionName, root };
};

const isManagedExtensionEntry = (extensionsRoot: string, entry: Dirent): boolean =>
  entry.isDirectory() &&
  !entry.name.startsWith(".") &&
  isManagedExtensionRoot(path.join(extensionsRoot, entry.name));
