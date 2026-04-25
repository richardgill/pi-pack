import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { readJson } from "~/lib/json";
import type { PackageJson } from "~/lib/package-json";
import { runPnpm } from "~/lib/pnpm";
import type { UpgradeTarget } from "./targets";

export type DependencyUpgrade = {
  name: string;
  beforeVersion?: string;
  afterVersion?: string;
};

export type UpgradeResult = UpgradeTarget & {
  dependencies: DependencyUpgrade[];
  changed: boolean;
};

export type UpgradeFailure = UpgradeTarget & {
  error: unknown;
};

export type UpgradeBatchResult = {
  results: UpgradeResult[];
  failures: UpgradeFailure[];
};

type UpgradeOptions = {
  bump: boolean;
};

export const upgradeTargets = async (
  targets: UpgradeTarget[],
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
  target: UpgradeTarget,
  options: UpgradeOptions,
): Promise<UpgradeResult> => {
  const packageNames = readDependencyNames(target.root);
  const beforeLockfile = readOptionalText(lockfilePath(target.root));
  const beforeVersions = readDependencyVersions(target.root, packageNames);

  await runPnpm({ cwd: target.root, args: createPnpmUpgradeArgs(options) });

  const afterVersions = readDependencyVersions(target.root, packageNames);
  const dependencies = createDependencyUpgrades(packageNames, beforeVersions, afterVersions);

  return {
    ...target,
    dependencies,
    changed:
      hasDependencyChange(dependencies) ||
      beforeLockfile !== readOptionalText(lockfilePath(target.root)),
  };
};

const createPnpmUpgradeArgs = (options: UpgradeOptions): string[] => {
  if (options.bump) return ["update", "--latest"];
  return ["update"];
};

const readDependencyNames = (root: string): string[] => {
  const packageJson = readJson<PackageJson>(path.join(root, "package.json"));
  const packageNames = Object.keys(packageJson.dependencies ?? {});
  if (packageNames.length > 0) return packageNames;
  throw new Error(`No dependencies found in ${path.join(root, "package.json")}`);
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

const createDependencyUpgrades = (
  packageNames: string[],
  beforeVersions: Map<string, string | undefined>,
  afterVersions: Map<string, string | undefined>,
): DependencyUpgrade[] =>
  packageNames.map((name) => ({
    name,
    beforeVersion: beforeVersions.get(name),
    afterVersion: afterVersions.get(name),
  }));

const hasDependencyChange = (dependencies: DependencyUpgrade[]): boolean =>
  dependencies.some((dependency) => dependency.beforeVersion !== dependency.afterVersion);

const readOptionalText = (filePath: string): string | undefined => {
  if (!existsSync(filePath)) return undefined;
  return readFileSync(filePath, "utf8");
};

const lockfilePath = (root: string): string => path.join(root, "pnpm-lock.yaml");
