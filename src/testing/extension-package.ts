import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { writeJson } from "~/lib/json";

export const createExtensionPackage = (
  root: string,
  name: string,
  version = "1.0.0",
  requiresConfigEdit?: boolean,
): string => {
  const packageRoot = path.join(root, name);
  mkdirSync(path.join(packageRoot, "src"), { recursive: true });
  writeExtensionPackageJson(
    packageRoot,
    name,
    version,
    "./src/default-config.ts",
    requiresConfigEdit,
  );
  writeDefaultConfig(packageRoot, name, version);
  return packageRoot;
};

export const createPackageWithoutDefaultConfig = (root: string, name: string): string => {
  const packageRoot = path.join(root, name);
  mkdirSync(packageRoot, { recursive: true });
  writeJson(path.join(packageRoot, "package.json"), {
    name,
    version: "1.0.0",
    type: "module",
  });
  return packageRoot;
};

export const updateExtensionPackageVersion = (
  packageRoot: string,
  name: string,
  version: string,
): void => {
  writeExtensionPackageJson(packageRoot, name, version, "./src/default-config.ts");
  writeDefaultConfig(packageRoot, name, version);
};

export type PackedExtensionPackage = {
  fileName: string;
  tarball: Buffer;
};

export const packExtensionPackage = (packageRoot: string, destinationRoot: string): string => {
  const targetPath = path.join(destinationRoot, `${path.basename(packageRoot)}.tgz`);
  const fileName = npmPack(packageRoot, destinationRoot);

  rmSync(targetPath, { force: true });
  renameSync(path.join(destinationRoot, fileName), targetPath);
  return targetPath;
};

export const packExtensionPackageForRegistry = (
  packageRoot: string,
  destinationRoot: string,
): PackedExtensionPackage => {
  const fileName = npmPack(packageRoot, destinationRoot);
  return { fileName, tarball: readFileSync(path.join(destinationRoot, fileName)) };
};

export const readText = (cwd: string, filePath: string): string =>
  readFileSync(path.join(cwd, filePath), "utf8");

const npmPack = (packageRoot: string, destinationRoot: string): string => {
  const result = spawnSync("npm", ["pack", "--pack-destination", destinationRoot], {
    cwd: packageRoot,
    encoding: "utf8",
  });

  if (result.status !== 0) throw new Error(result.stdout + result.stderr);
  return result.stdout.trim();
};

const writeExtensionPackageJson = (
  packageRoot: string,
  name: string,
  version: string,
  defaultConfig: string,
  requiresConfigEdit?: boolean,
): void => {
  const piPackConfig = {
    "default-config": defaultConfig,
    ...(requiresConfigEdit === undefined ? {} : { "requires-config-edit": requiresConfigEdit }),
  };

  writeJson(path.join(packageRoot, "package.json"), {
    name,
    version,
    type: "module",
    "pi-pack": piPackConfig,
  });
};

const writeDefaultConfig = (packageRoot: string, name: string, version: string): void => {
  writeFileSync(
    path.join(packageRoot, "src", "default-config.ts"),
    `export default "${name}@${version}";\n`,
    "utf8",
  );
};
