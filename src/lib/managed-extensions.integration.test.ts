import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "vite-plus/test";
import { writeJson } from "~/lib/json";
import { withEnvVar } from "~/testing/env";
import { withTempDir } from "~/testing/temp-dir";
import { listManagedExtensions, resolveManagedExtensions } from "./managed-extensions";

test("listManagedExtensions returns managed extension directories sorted by name", async () => {
  await withTempDir(async (agentDir) => {
    const extensionsRoot = path.join(agentDir, "extensions");
    writeManagedPackageJson(extensionsRoot, "zeta");
    writeManagedPackageJson(extensionsRoot, "alpha");
    writePackageJson(extensionsRoot, "unmanaged", { name: "unmanaged" });
    writeManagedPackageJson(extensionsRoot, ".hidden");
    writeFileSync(path.join(extensionsRoot, "file.txt"), "not a directory", "utf8");

    await withEnvVar("PI_CODING_AGENT_DIR", agentDir, () => {
      expect(listManagedExtensions()).toEqual([
        { extensionName: "alpha", root: path.join(extensionsRoot, "alpha") },
        { extensionName: "zeta", root: path.join(extensionsRoot, "zeta") },
      ]);
    });
  });
});

test("listManagedExtensions returns an empty array when no managed extensions are installed", async () => {
  await withTempDir(async (agentDir) => {
    const extensionsRoot = path.join(agentDir, "extensions");
    mkdirSync(extensionsRoot, { recursive: true });
    writePackageJson(extensionsRoot, "unmanaged", { name: "unmanaged" });
    writeFileSync(path.join(extensionsRoot, "file.txt"), "not a directory", "utf8");

    await withEnvVar("PI_CODING_AGENT_DIR", agentDir, () => {
      expect(listManagedExtensions()).toEqual([]);
    });
  });
});

test("resolveManagedExtensions resolves managed names and rejects missing or unmanaged names", async () => {
  await withTempDir(async (agentDir) => {
    const extensionsRoot = path.join(agentDir, "extensions");
    writeManagedPackageJson(extensionsRoot, "alpha");
    writePackageJson(extensionsRoot, "unmanaged", { name: "unmanaged" });

    await withEnvVar("PI_CODING_AGENT_DIR", agentDir, () => {
      expect(resolveManagedExtensions(["alpha"])).toEqual([
        { extensionName: "alpha", root: path.join(extensionsRoot, "alpha") },
      ]);
      expect(() => resolveManagedExtensions(["unmanaged"])).toThrow(
        `Installed pi-pack extension not found: ${path.join(extensionsRoot, "unmanaged")}`,
      );
      expect(() => resolveManagedExtensions(["missing"])).toThrow(
        `Installed pi-pack extension not found: ${path.join(extensionsRoot, "missing")}`,
      );
    });
  });
});

const writeManagedPackageJson = (extensionsRoot: string, extensionName: string): void => {
  writePackageJson(extensionsRoot, extensionName, {
    name: extensionName,
    "pi-pack": { managed: true },
  });
};

const writePackageJson = (
  extensionsRoot: string,
  extensionName: string,
  packageJson: unknown,
): void => {
  writeJson(path.join(extensionsRoot, extensionName, "package.json"), packageJson);
};
