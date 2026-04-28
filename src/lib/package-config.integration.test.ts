import path from "node:path";
import { expect, test } from "vite-plus/test";
import { writeJson } from "~/lib/json";
import { withTempDir } from "~/testing/temp-dir";
import {
  looksLikeVanillaPiExtension,
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

const vanillaPiExtensionCases = [
  {
    name: "pi.extensions",
    packageJson: { pi: { extensions: ["./extensions"] } },
    expected: true,
  },
  {
    name: "pi-package keyword",
    packageJson: { keywords: ["pi-package"] },
    expected: true,
  },
  {
    name: "pi-extension keyword",
    packageJson: { keywords: ["pi-extension"] },
    expected: true,
  },
  {
    name: "pi-pack default config",
    packageJson: {
      pi: { extensions: ["./extensions"] },
      "pi-pack": { "default-config": "./src/default-config.ts" },
    },
    expected: false,
  },
  {
    name: "pi-pack monorepo config",
    packageJson: {
      keywords: ["pi-package"],
      "pi-pack": { "extensions-dir": "extensions" },
    },
    expected: false,
  },
];

vanillaPiExtensionCases.forEach(({ name, packageJson, expected }) => {
  test(`looksLikeVanillaPiExtension detects ${name}`, async () => {
    await withTempDir(({ cwd }) => {
      writeJson(path.join(cwd, "package.json"), packageJson);

      expect(looksLikeVanillaPiExtension(cwd)).toBe(expected);
    });
  });
});
