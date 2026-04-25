import path from "node:path";
import { expect, test } from "vite-plus/test";
import { writeJson } from "~/lib/json";
import { withTempDir } from "~/testing/temp-dir";
import {
  readConfiguredExtensionsFolder,
  readRequiredConfiguredExtensionsFolder,
} from "./package-config";

test("readConfiguredExtensionsFolder returns undefined for missing optional config", async () => {
  await withTempDir((cwd) => {
    expect(readConfiguredExtensionsFolder(path.join(cwd, "package.json"))).toBeUndefined();
  });
});

test("readRequiredConfiguredExtensionsFolder requires package.json and configured folder", async () => {
  await withTempDir((cwd) => {
    const packageJsonPath = path.join(cwd, "package.json");

    expect(() => readRequiredConfiguredExtensionsFolder(packageJsonPath)).toThrow(
      `Missing package.json: ${packageJsonPath}`,
    );

    writeJson(packageJsonPath, {});

    expect(() => readRequiredConfiguredExtensionsFolder(packageJsonPath)).toThrow(
      `Missing pi-pack.extensions-folder in ${packageJsonPath}`,
    );
  });
});

test("configured extensions folders must be safe relative paths", async () => {
  await withTempDir((cwd) => {
    const packageJsonPath = path.join(cwd, "package.json");
    writeJson(packageJsonPath, { "pi-pack": { "extensions-folder": "../packages" } });

    expect(() => readConfiguredExtensionsFolder(packageJsonPath)).toThrow(
      "pi-pack.extensions-folder must be a safe relative path: ../packages.",
    );
  });
});
