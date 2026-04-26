import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { runCommand } from "~/lib/command";
import { readJson, writeJson } from "~/lib/json";
import { INSTALLED_EXTENSION_PACKAGE_JSON, type PackageJson } from "~/lib/package-json";

type PackageJsonWithBin = {
  bin?: string | Record<string, string>;
};

type RunPnpmOptions = {
  cwd: string;
  args: string[];
};

const require = createRequire(import.meta.url);

// pnpm doesn't allow us to grab the package name if it's in a subfolder
// we write it to /tmp and read it from there
export const inferPackageName = async (source: string): Promise<string> => {
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), "pi-pack-install-"));

  try {
    writeJson(path.join(tempRoot, "package.json"), INSTALLED_EXTENSION_PACKAGE_JSON);
    await pnpmAddLockfileOnly(tempRoot, source);
    return readSingleDependencyName(path.join(tempRoot, "package.json"));
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
};

export const pnpmAdd = async (cwd: string, source: string): Promise<void> => {
  await runPnpm({ cwd, args: ["add", "--ignore-scripts", source] });
};

export const runPnpm = async ({ cwd, args }: RunPnpmOptions): Promise<void> => {
  await runCommand(process.execPath, [resolvePnpmBin(), ...args], cwd);
};

const getPnpmBin = (packageJson: PackageJsonWithBin): string => {
  if (typeof packageJson.bin === "string") return packageJson.bin;
  const pnpmBin = packageJson.bin?.["pnpm"];
  if (pnpmBin) return pnpmBin;
  throw new Error("Could not resolve bundled pnpm binary");
};

// find the pnpm bundled with pi-pack
export const resolvePnpmBin = (): string => {
  const packagePath = require.resolve("pnpm");
  const packageJson = readPackageJson(packagePath);
  const bin = getPnpmBin(packageJson);
  return path.join(path.dirname(packagePath), bin);
};

const pnpmAddLockfileOnly = async (cwd: string, source: string): Promise<void> => {
  await runPnpm({ cwd, args: ["add", "--lockfile-only", source] });
};

const readPackageJson = (packagePath: string): PackageJsonWithBin =>
  JSON.parse(readFileSync(packagePath, "utf8")) as PackageJsonWithBin;

const readSingleDependencyName = (packagePath: string): string => {
  const packageJson = readJson<PackageJson>(packagePath);
  const dependencies = Object.keys(packageJson.dependencies ?? {});
  if (dependencies.length === 1) return dependencies[0];
  throw new Error(`Expected one dependency in ${packagePath}`);
};
