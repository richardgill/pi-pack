import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { readJson } from "~/lib/json";
import type { ManagedExtension } from "~/lib/managed-extensions";
import type { PackageJson } from "~/lib/package-json";
import { runPnpm } from "~/lib/pnpm";

export type DependencyUpgrade = {
  name: string;
  beforeVersion?: string;
  afterVersion?: string;
};

export type UpgradeResult = ManagedExtension & {
  dependencies: DependencyUpgrade[];
  changed: boolean;
};

export type UpgradeFailure = ManagedExtension & {
  error: unknown;
};

export type UpgradeBatchResult = {
  results: UpgradeResult[];
  failures: UpgradeFailure[];
};

type UpgradeOptions = {
  bump: boolean;
};

export const runUpgrades = async (
  targets: ManagedExtension[],
  options: UpgradeOptions,
): Promise<UpgradeBatchResult> => {
  const results: UpgradeResult[] = [];
  const failures: UpgradeFailure[] = [];

  for (const target of targets) {
    try {
      results.push(await upgradeTarget(target, options));
    } catch (error) {
      failures.push({ ...target, error });
    }
  }

  return { results, failures };
};

const upgradeTarget = async (
  target: ManagedExtension,
  options: UpgradeOptions,
): Promise<UpgradeResult> => {
  const packageNames = readDependencyNames(target.root);
  if (packageNames.length === 0) {
    throw new Error(`No dependencies found in ${path.join(target.root, "package.json")}`);
  }

  const beforeLockfile = readLockfile(target.root);
  const beforeVersions = readDependencyVersions(target.root, packageNames);

  await runPnpm({ cwd: target.root, args: createPnpmUpgradeArgs(options) });

  const afterVersions = readDependencyVersions(target.root, packageNames);
  const dependencies = diffDependencyVersions(packageNames, beforeVersions, afterVersions);
  const lockfileChanged = beforeLockfile !== readLockfile(target.root);

  return {
    ...target,
    dependencies,
    changed: anyDependencyChanged(dependencies) || lockfileChanged,
  };
};

const createPnpmUpgradeArgs = (options: UpgradeOptions): string[] => {
  if (options.bump) return ["update", "--latest"];
  return ["update"];
};

const readDependencyNames = (root: string): string[] => {
  const packageJson = readJson<PackageJson>(path.join(root, "package.json"));
  return Object.keys(packageJson.dependencies ?? {});
};

const readDependencyVersions = (
  root: string,
  packageNames: string[],
): Map<string, string | undefined> =>
  new Map(
    packageNames.map((packageName) => [
      packageName,
      readInstalledPackageVersion(root, packageName),
    ]),
  );

const readInstalledPackageVersion = (root: string, packageName: string): string | undefined => {
  const packagePath = path.join(root, "node_modules", packageName, "package.json");
  if (!existsSync(packagePath)) return undefined;
  return readJson<PackageJson>(packagePath).version;
};

const diffDependencyVersions = (
  packageNames: string[],
  beforeVersions: Map<string, string | undefined>,
  afterVersions: Map<string, string | undefined>,
): DependencyUpgrade[] =>
  packageNames.map((name) => ({
    name,
    beforeVersion: beforeVersions.get(name),
    afterVersion: afterVersions.get(name),
  }));

const anyDependencyChanged = (dependencies: DependencyUpgrade[]): boolean =>
  dependencies.some((dependency) => dependency.beforeVersion !== dependency.afterVersion);

const readLockfile = (root: string): string | undefined => {
  const lockfilePath = path.join(root, "pnpm-lock.yaml");
  if (!existsSync(lockfilePath)) return undefined;
  return readFileSync(lockfilePath, "utf8");
};
