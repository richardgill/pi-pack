import path from "node:path";
import { expect, test } from "vite-plus/test";
import { writeJson } from "~/lib/json";
import { withTempDir } from "~/testing/temp-dir";
import {
  readPackageNameFromPackageRoot,
  readPiPackExtensionsDir,
  readPiPackExtensionsDirFromPackageRoot,
  readRequiredPiPackExtensionsDir,
} from "./package-config";

test("readPiPackExtensionsDir returns undefined for missing optional config", async () => {
  await withTempDir(({ cwd }) => {
    expect(readPiPackExtensionsDir(path.join(cwd, "package.json"))).toBeUndefined();
  });
});

test("readRequiredPiPackExtensionsDir requires package.json and configured dir", async () => {
  await withTempDir(({ cwd }) => {
    const packageJsonPath = path.join(cwd, "package.json");

    expect(() => readRequiredPiPackExtensionsDir(packageJsonPath)).toThrow(
      `Missing package.json: ${packageJsonPath}`,
    );

    writeJson(packageJsonPath, {});

    expect(() => readRequiredPiPackExtensionsDir(packageJsonPath)).toThrow(
      `Missing pi-pack.extensions-dir in ${packageJsonPath}`,
    );
  });
});

test("configured extensions dirs must be safe relative paths", async () => {
  await withTempDir(({ cwd }) => {
    const packageJsonPath = path.join(cwd, "package.json");
    writeJson(packageJsonPath, { "pi-pack": { "extensions-dir": "../packages" } });

    expect(() => readPiPackExtensionsDir(packageJsonPath)).toThrow(
      "pi-pack.extensions-dir must be a safe relative path: ../packages.",
    );
  });
});

test("package root helpers read package config", async () => {
  await withTempDir(({ cwd: packageRoot }) => {
    writeJson(path.join(packageRoot, "package.json"), {
      name: "pi-extensions",
      "pi-pack": { "extensions-dir": "packages" },
    });

    expect(readPiPackExtensionsDirFromPackageRoot(packageRoot)).toBe("packages");
    expect(readPackageNameFromPackageRoot(packageRoot)).toBe("pi-extensions");
  });
});

test("readPackageNameFromPackageRoot falls back to directory name", async () => {
  await withTempDir(({ cwd: packageRoot }) => {
    expect(readPackageNameFromPackageRoot(packageRoot)).toBe(path.basename(packageRoot));
  });
});
