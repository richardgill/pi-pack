import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { readJson } from "~/lib/json";
import type { ManagedExtension } from "~/lib/managed-extensions";
import type { PackageJson, PiPackPackageJson } from "~/lib/package-json";
import { runPnpm } from "~/lib/pnpm";

export type DependencyUpgrade = {
  name: string;
  beforeVersion?: string;
  afterVersion?: string;
  beforeRequestedVersion: string;
  afterRequestedVersion?: string;
};

export type UpgradeResult = ManagedExtension & {
  dependencies: DependencyUpgrade[];
  changed: boolean;
};

export type UpgradeFailure = ManagedExtension & {
  error: unknown;
};

export type UpgradeOptions = {
  bump: boolean;
};

type InstalledDependency = {
  name: string;
  requestedVersion: string;
  installedVersion?: string;
  isPiPackExtension: boolean;
};

export const upgradeExtension = async (
  managedExtension: ManagedExtension,
  options: UpgradeOptions,
): Promise<UpgradeResult> => {
  const beforeDependencies = readDependencies(managedExtension.root);
  assertSinglePiPackDependency(managedExtension.root, beforeDependencies);

  const beforeLockfile = readLockfile(managedExtension.root);

  await runPnpm({ cwd: managedExtension.root, args: createPnpmUpgradeArgs(options) });

  const afterDependencies = readDependencies(managedExtension.root);
  const dependencies = diffDependencyVersions(beforeDependencies, afterDependencies);
  const lockfileChanged = beforeLockfile !== readLockfile(managedExtension.root);

  return {
    ...managedExtension,
    dependencies,
    changed: anyDependencyChanged(dependencies) || lockfileChanged,
  };
};

const createPnpmUpgradeArgs = (options: UpgradeOptions): string[] => {
  if (options.bump) return ["update", "--latest"];
  return ["update"];
};

const readDependencies = (root: string): InstalledDependency[] => {
  const packageJson = readJson<PackageJson>(path.join(root, "package.json"));
  return Object.entries(packageJson.dependencies ?? {}).map(([name, requestedVersion]) =>
    readInstalledDependency(root, name, requestedVersion ?? ""),
  );
};

const readInstalledDependency = (
  root: string,
  name: string,
  requestedVersion: string,
): InstalledDependency => {
  const packageJson = readInstalledPackageJson(root, name);

  return {
    name,
    requestedVersion,
    installedVersion: packageJson?.version,
    isPiPackExtension: packageJson?.["pi-pack"] !== undefined,
  };
};

const readInstalledPackageJson = (
  root: string,
  packageName: string,
): PiPackPackageJson | undefined => {
  const packagePath = path.join(root, "node_modules", packageName, "package.json");
  if (!existsSync(packagePath)) return undefined;
  return readJson<PiPackPackageJson>(packagePath);
};

const assertSinglePiPackDependency = (root: string, dependencies: InstalledDependency[]): void => {
  assertSingleDependency(root, dependencies);
  const dependency = dependencies[0];
  if (dependency.isPiPackExtension) return;
  throw new Error(
    `Expected dependency to be a pi-pack extension in ${readInstalledPackageJsonPath(root, dependency.name)}`,
  );
};

const assertSingleDependency = (root: string, dependencies: InstalledDependency[]): void => {
  const packageJsonPath = path.join(root, "package.json");
  const dependencyNames = dependencies.map((dependency) => dependency.name);
  if (dependencies.length === 0) throw new Error(`No dependencies found in ${packageJsonPath}`);
  if (dependencies.length > 1) {
    throw new Error(
      `Expected one dependency in ${packageJsonPath}, found ${dependencies.length}: ${dependencyNames.join(", ")}`,
    );
  }
};

const readInstalledPackageJsonPath = (root: string, packageName: string): string =>
  path.join(root, "node_modules", packageName, "package.json");

const diffDependencyVersions = (
  beforeDependencies: InstalledDependency[],
  afterDependencies: InstalledDependency[],
): DependencyUpgrade[] => {
  const afterDependenciesByName = new Map(
    afterDependencies.map((dependency) => [dependency.name, dependency]),
  );

  return beforeDependencies.map((beforeDependency) => {
    const afterDependency = afterDependenciesByName.get(beforeDependency.name);

    return {
      name: beforeDependency.name,
      beforeVersion: beforeDependency.installedVersion,
      afterVersion: afterDependency?.installedVersion,
      beforeRequestedVersion: beforeDependency.requestedVersion,
      afterRequestedVersion: afterDependency?.requestedVersion,
    };
  });
};

const anyDependencyChanged = (dependencies: DependencyUpgrade[]): boolean =>
  dependencies.some(
    (dependency) =>
      dependency.beforeVersion !== dependency.afterVersion ||
      dependency.beforeRequestedVersion !== dependency.afterRequestedVersion,
  );

const readLockfile = (root: string): string | undefined => {
  const lockfilePath = path.join(root, "pnpm-lock.yaml");
  if (!existsSync(lockfilePath)) return undefined;
  return readFileSync(lockfilePath, "utf8");
};
