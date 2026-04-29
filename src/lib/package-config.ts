import { spawnSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { readJson } from "~/lib/json";
import type { PiPackPackageJson } from "~/lib/package-json";
import { assertSafeRelativePath } from "~/lib/path";

const PACKAGE_SCAN_MAX_DEPTH = 4;

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
  if (packageJson !== undefined && hasPiPackPackageConfig(packageJson)) return false;

  return findPackageJsonPaths(packageRoot).some(looksLikeVanillaPiExtensionPackageJsonPath);
};

const findPackageJsonPaths = (root: string): string[] =>
  readGitPackageJsonPaths(root) ?? findPackageJsonPathsByWalking(root);

const readGitPackageJsonPaths = (root: string): string[] | undefined => {
  const result = spawnSync(
    "git",
    [
      "ls-files",
      "-z",
      "--cached",
      "--others",
      "--exclude-standard",
      "--",
      "package.json",
      ":(glob)**/package.json",
    ],
    { cwd: root, encoding: "utf8" },
  );
  if (result.status !== 0) return undefined;

  return result.stdout
    .split("\0")
    .filter(Boolean)
    .filter(isPackageJsonWithinScanDepth)
    .map((relativePath) => path.join(root, relativePath));
};

const isPackageJsonWithinScanDepth = (relativePath: string): boolean =>
  relativePath.split("/").length - 1 <= PACKAGE_SCAN_MAX_DEPTH;

const findPackageJsonPathsByWalking = (root: string, depth = 0): string[] => {
  if (depth > PACKAGE_SCAN_MAX_DEPTH) return [];

  const packageJsonPath = path.join(root, "package.json");
  const current = existsSync(packageJsonPath) ? [packageJsonPath] : [];
  if (depth === PACKAGE_SCAN_MAX_DEPTH) return current;

  return [
    ...current,
    ...readChildDirs(root).flatMap((dir) => findPackageJsonPathsByWalking(dir, depth + 1)),
  ];
};

const readChildDirs = (root: string): string[] => {
  try {
    return readdirSync(root, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => path.join(root, entry.name));
  } catch {
    return [];
  }
};

const looksLikeVanillaPiExtensionPackageJsonPath = (packageJsonPath: string): boolean => {
  const packageJson = readPackageJsonIfExists(packageJsonPath);
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

export const readPiPackExtensionNamesFromPackageRoot = (
  packageRoot: string,
): string[] | undefined => {
  const extensionsDir = readPiPackExtensionsDirFromPackageRoot(packageRoot);
  if (extensionsDir === undefined) return undefined;

  return readChildDirs(path.join(packageRoot, extensionsDir))
    .filter(looksLikePiPackExtensionPackage)
    .map((dir) => path.basename(dir))
    .sort((left, right) => left.localeCompare(right));
};

const looksLikePiPackExtensionPackage = (packageRoot: string): boolean => {
  const packageJson = readPackageJsonFromPackageRoot(packageRoot);
  return packageJson?.["pi-pack"]?.["default-config"] !== undefined;
};

export const readPiPackExtensionsDirFromPackageRoot = (packageRoot: string): string | undefined =>
  readPiPackExtensionsDir(path.join(packageRoot, "package.json"));

export const readPackageNameFromPackageRoot = (packageRoot: string): string =>
  readPackage(path.join(packageRoot, "package.json")).name ?? path.basename(packageRoot);
