import path from "node:path";
import { expect, test } from "vite-plus/test";
import { writeJson } from "~/lib/json";
import { withTempDir } from "~/testing/temp-dir";
import {
  readPackageNameFromPackageRoot,
  readPiPackExtensionsFolder,
  readPiPackExtensionsFolderFromPackageRoot,
  readRequiredPiPackExtensionsFolder,
} from "./package-config";

test("readPiPackExtensionsFolder returns undefined for missing optional config", async () => {
  await withTempDir(({ cwd }) => {
    expect(readPiPackExtensionsFolder(path.join(cwd, "package.json"))).toBeUndefined();
  });
});

test("readRequiredPiPackExtensionsFolder requires package.json and configured folder", async () => {
  await withTempDir(({ cwd }) => {
    const packageJsonPath = path.join(cwd, "package.json");

    expect(() => readRequiredPiPackExtensionsFolder(packageJsonPath)).toThrow(
      `Missing package.json: ${packageJsonPath}`,
    );

    writeJson(packageJsonPath, {});

    expect(() => readRequiredPiPackExtensionsFolder(packageJsonPath)).toThrow(
      `Missing pi-pack.extensions-folder in ${packageJsonPath}`,
    );
  });
});

test("configured extensions folders must be safe relative paths", async () => {
  await withTempDir(({ cwd }) => {
    const packageJsonPath = path.join(cwd, "package.json");
    writeJson(packageJsonPath, { "pi-pack": { "extensions-folder": "../packages" } });

    expect(() => readPiPackExtensionsFolder(packageJsonPath)).toThrow(
      "pi-pack.extensions-folder must be a safe relative path: ../packages.",
    );
  });
});

test("package root helpers read package config", async () => {
  await withTempDir(({ cwd: packageRoot }) => {
    writeJson(path.join(packageRoot, "package.json"), {
      name: "pi-extensions",
      "pi-pack": { "extensions-folder": "packages" },
    });

    expect(readPiPackExtensionsFolderFromPackageRoot(packageRoot)).toBe("packages");
    expect(readPackageNameFromPackageRoot(packageRoot)).toBe("pi-extensions");
  });
});

test("readPackageNameFromPackageRoot falls back to directory name", async () => {
  await withTempDir(({ cwd: packageRoot }) => {
    expect(readPackageNameFromPackageRoot(packageRoot)).toBe(path.basename(packageRoot));
  });
});
