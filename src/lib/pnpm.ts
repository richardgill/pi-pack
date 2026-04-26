import { mkdtempSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { runCommand } from "~/lib/command";
import { writeJson } from "~/lib/json";
import { INSTALLED_EXTENSION_PACKAGE_JSON, readPackageJson } from "~/lib/package-json";

type RunPnpmOptions = {
  cwd: string;
  args: string[];
};

const require = createRequire(import.meta.url);

// pnpm doesn't allow us to grab the package name if it's in a subdir
// we write it to /tmp and read it from there
export const inferPackageName = async (source: string): Promise<string> => {
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), "pi-pack-install-"));

  try {
    writeJson(path.join(tempRoot, "package.json"), INSTALLED_EXTENSION_PACKAGE_JSON);
    await runPnpm({ cwd: tempRoot, args: ["add", "--lockfile-only", source] });
    return readSingleDependencyName(path.join(tempRoot, "package.json"));
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
};

export const pnpmAdd = async (cwd: string, source: string): Promise<void> => {
  // --ignore-scripts for extra npm package safety
  await runPnpm({ cwd, args: ["add", "--ignore-scripts", source] });
};

export const runPnpm = async ({ cwd, args }: RunPnpmOptions): Promise<void> => {
  await runCommand(process.execPath, [resolvePnpmBin(), ...args], cwd);
};

// find the path to pnpm bundled with pi-pack
export const resolvePnpmBin = (): string => {
  const packagePath = require.resolve("pnpm");
  const { bin } = readPackageJson(packagePath);
  const pnpmBin = typeof bin === "string" ? bin : bin?.["pnpm"];
  if (!pnpmBin) throw new Error("Could not resolve bundled pnpm binary");
  return path.join(path.dirname(packagePath), pnpmBin);
};

const readSingleDependencyName = (packagePath: string): string => {
  const dependencies = Object.keys(readPackageJson(packagePath).dependencies ?? {});
  assertSingleDependency(dependencies, packagePath);
  return dependencies[0];
};

const assertSingleDependency = (dependencies: string[], packagePath: string): void => {
  if (dependencies.length !== 1) throw new Error(`Expected one dependency in ${packagePath}`);
};
