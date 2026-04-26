import { existsSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "vite-plus/test";
import { readJson, writeJson } from "~/lib/json";
import {
  createExtensionPackage,
  createPackageWithoutDefaultConfig,
} from "~/testing/extension-package";
import { withEnvVar } from "~/testing/env";
import { expectFileTree } from "~/testing/fs";
import { withTempDir } from "~/testing/temp-dir";

test("pi-pack install installs a local package into pi's extensions dir", async () => {
  await withTempDir(async ({ cwd, run }) => {
    const agentDir = path.join(cwd, "agent");
    const source = createExtensionPackage(cwd, "files");

    const result = await run(`pi-pack install ${source}`);

    const extensionRoot = path.join(agentDir, "extensions", "files");
    expect(result.stdout).toBe(
      [
        "Installed pi extension: files",
        `Location: ${extensionRoot}`,
        "",
        `Edit config: ${path.join(extensionRoot, "config.ts")}`,
        "",
      ].join("\n"),
    );
    expectFileTree(extensionRoot, {
      files: {
        "config.ts": 'export default "files@1.0.0";\n',
        "package.json": {
          json: {
            private: true,
            type: "module",
            pi: { extensions: ["./config.ts"] },
            "pi-pack": { managed: true },
            dependencies: { files: expect.any(String) },
          },
        },
        "pnpm-lock.yaml": true,
        "node_modules/files/package.json": true,
      },
      missing: ["index.ts"],
    });
  });
});

test("pi-pack install hides config edit instructions when the extension does not require edits", async () => {
  await withTempDir(async ({ cwd, run }) => {
    const agentDir = path.join(cwd, "agent");
    const source = createExtensionPackage(cwd, "files", "1.0.0", false);

    const result = await run(`pi-pack install ${source}`);

    const extensionRoot = path.join(agentDir, "extensions", "files");
    expect(result.stdout).toBe(
      ["Installed pi extension: files", `Location: ${extensionRoot}`, ""].join("\n"),
    );
    expectFileTree(extensionRoot, {
      files: { "config.ts": 'export default "files@1.0.0";\n' },
    });
  });
});

test("pi-pack install does not run package lifecycle scripts", async () => {
  await withTempDir(async ({ cwd, run }) => {
    const agentDir = path.join(cwd, "agent");
    const source = createExtensionPackage(cwd, "scripts");
    const scriptOutput = path.join(cwd, "postinstall-ran");
    const packageJson = readJson<Record<string, unknown>>(path.join(source, "package.json"));
    writeFileSync(
      path.join(source, "postinstall.cjs"),
      `require("node:fs").writeFileSync(${JSON.stringify(scriptOutput)}, "ran");\n`,
      "utf8",
    );
    writeJson(path.join(source, "package.json"), {
      ...packageJson,
      scripts: { postinstall: "node postinstall.cjs" },
    });

    await run(`pi-pack install ${source}`);

    expect(existsSync(scriptOutput)).toBe(false);
    expectFileTree(agentDir, {
      files: { "extensions/scripts/node_modules/scripts/package.json": true },
    });
  });
});

test("pi-pack install --as installs under a custom extension name", async () => {
  await withTempDir(async ({ cwd, run }) => {
    const agentDir = path.join(cwd, "agent");
    const source = createExtensionPackage(cwd, "files");

    await run(`pi-pack install ${source} --as baz`);

    const extensionRoot = path.join(agentDir, "extensions", "baz");
    expectFileTree(extensionRoot, {
      files: {
        "config.ts": 'export default "files@1.0.0";\n',
        "node_modules/files/package.json": true,
      },
    });
    expectFileTree(agentDir, { missing: ["extensions/files"] });
  });
});

test("pi-pack install --extension installs a package from a configured monorepo", async () => {
  await withTempDir(async ({ cwd, run }) => {
    const agentDir = path.join(cwd, "agent");
    const repoRoot = path.join(cwd, "repo");
    writeJson(path.join(repoRoot, "package.json"), {
      "pi-pack": { "extensions-folder": "packages" },
    });
    createExtensionPackage(path.join(repoRoot, "packages"), "files");

    await run(`pi-pack install ${repoRoot} --extension files`);

    const extensionRoot = path.join(agentDir, "extensions", "files");
    expectFileTree(extensionRoot, {
      files: {
        "config.ts": 'export default "files@1.0.0";\n',
        "node_modules/files/package.json": true,
      },
    });
  });
});

test("pi-pack install --extension rejects configured folders that escape the source root", async () => {
  await withTempDir(async ({ cwd, run }) => {
    const agentDir = path.join(cwd, "agent");
    const repoRoot = path.join(cwd, "repo");
    writeJson(path.join(repoRoot, "package.json"), {
      "pi-pack": { "extensions-folder": "../packages" },
    });
    createExtensionPackage(path.join(cwd, "packages"), "files");

    const result = await run(`pi-pack install ${repoRoot} --extension files`);

    expect(result.stderr).toContain(
      "pi-pack.extensions-folder must be a safe relative path: ../packages.",
    );
    expectFileTree(agentDir, { missing: ["extensions/files"] });
  });
});

test("pi-pack install resolves relative file sources against the command cwd", async () => {
  await withTempDir(async ({ cwd, run }) => {
    const agentDir = path.join(cwd, "agent");
    createExtensionPackage(cwd, "files");

    await run("pi-pack install file:./files");

    const extensionRoot = path.join(agentDir, "extensions", "files");
    expectFileTree(extensionRoot, {
      files: {
        "config.ts": 'export default "files@1.0.0";\n',
        "node_modules/files/package.json": true,
      },
    });
  });
});

test("pi-pack install expands home-relative filesystem sources", async () => {
  await withTempDir(async ({ cwd, run }) => {
    const homeDir = path.join(cwd, "home");
    const agentDir = path.join(cwd, "agent");
    createExtensionPackage(path.join(homeDir, "code"), "files");

    await withEnvVar("HOME", homeDir, async () => {
      await run("pi-pack install ~/code/files");
    });

    const extensionRoot = path.join(agentDir, "extensions", "files");
    expectFileTree(extensionRoot, {
      files: {
        "config.ts": 'export default "files@1.0.0";\n',
        "node_modules/files/package.json": true,
      },
    });
  });
});

test("pi-pack install --extension resolves relative file sources against the command cwd", async () => {
  await withTempDir(async ({ cwd, run }) => {
    const agentDir = path.join(cwd, "agent");
    writeJson(path.join(cwd, "repo", "package.json"), {
      "pi-pack": { "extensions-folder": "extensions" },
    });
    createExtensionPackage(path.join(cwd, "repo", "extensions"), "files");

    await run("pi-pack install file:./repo --extension files");

    const extensionRoot = path.join(agentDir, "extensions", "files");
    expectFileTree(extensionRoot, {
      files: {
        "config.ts": 'export default "files@1.0.0";\n',
        "node_modules/files/package.json": true,
      },
    });
  });
});

test("pi-pack install --extension requires a configured extensions folder", async () => {
  await withTempDir(async ({ cwd, run }) => {
    const agentDir = path.join(cwd, "agent");
    writeJson(path.join(cwd, "repo", "package.json"), {});
    createExtensionPackage(path.join(cwd, "repo", "extensions"), "files");

    const result = await run("pi-pack install ./repo --extension files");

    expect(result.stderr).toContain("Missing pi-pack.extensions-folder");
    expectFileTree(agentDir, { missing: ["extensions/files"] });
  });
});

test("pi-pack install --extension rejects path-like extension names", async () => {
  await withTempDir(async ({ cwd, run }) => {
    const repoRoot = path.join(cwd, "repo");
    writeJson(path.join(repoRoot, "package.json"), {
      "pi-pack": { "extensions-folder": "extensions" },
    });

    const result = await run(`pi-pack install ${repoRoot} --extension folder/files`);

    expect(result.stderr).toContain(
      "Extension name must be a single filesystem path segment: folder/files",
    );
  });
});

test("pi-pack install --extension rejects sources without extension name support", async () => {
  await withTempDir(async ({ run }) => {
    const npmResult = await run("pi-pack install npm:files --extension files");
    const bareResult = await run("pi-pack install files --extension files");

    expect(npmResult.stderr).toContain(
      "--extension can only be used with git:, file:, or filesystem path sources.",
    );
    expect(bareResult.stderr).toContain(
      "--extension can only be used with git:, file:, or filesystem path sources.",
    );
  });
});

test("pi-pack install rejects package names that are unsafe extension names", async () => {
  await withTempDir(async ({ cwd, run }) => {
    const agentDir = path.join(cwd, "agent");
    const source = createExtensionPackage(cwd, "@rich/files");

    const result = await run(`pi-pack install ${source}`);

    expect(result.stderr).toContain(
      "Extension name must be a single filesystem path segment: @rich/files",
    );
    expectFileTree(agentDir, { missing: ["extensions/files", "extensions/@rich/files"] });
  });
});

test("pi-pack install refuses to overwrite an existing extension", async () => {
  await withTempDir(async ({ cwd, run }) => {
    const agentDir = path.join(cwd, "agent");
    const source = createExtensionPackage(cwd, "files");

    await run(`pi-pack install ${source}`);

    const result = await run(`pi-pack install ${source}`);

    expect(result.stderr).toContain("Delete it manually first");
    expect(result.stderr).not.toContain("Command failed, Error:");
    expect(result.stderr).not.toContain("\n    at ");
    expectFileTree(path.join(agentDir, "extensions", "files"), {
      files: { "config.ts": 'export default "files@1.0.0";\n' },
    });
  });
});

test("pi-pack install --verbose shows stack traces for command failures", async () => {
  await withTempDir(async ({ cwd, run }) => {
    const source = createExtensionPackage(cwd, "files");

    await run(`pi-pack install ${source}`);

    const result = await run(`pi-pack install --verbose ${source}`);

    expect(result.stderr).toContain("Command failed, Error: Extension already exists");
    expect(result.stderr).toContain("\n    at ");
  });
});

test("pi-pack install fails clearly when default config is missing", async () => {
  await withTempDir(async ({ cwd, run }) => {
    const agentDir = path.join(cwd, "agent");
    const source = createPackageWithoutDefaultConfig(cwd, "missing-config");

    const result = await run(`pi-pack install ${source}`);

    expect(result.stderr).toContain("Could not find default config");
    expectFileTree(agentDir, { missing: ["extensions/missing-config"] });
  });
});

test("pi-pack install rejects default config paths that escape the package", async () => {
  await withTempDir(async ({ cwd, run }) => {
    const agentDir = path.join(cwd, "agent");
    const source = createExtensionPackage(cwd, "escape-config");
    const packageJson = readJson<Record<string, Record<string, string>>>(
      path.join(source, "package.json"),
    );
    writeFileSync(path.join(cwd, "secret.ts"), "export default 'secret';\n", "utf8");
    writeJson(path.join(source, "package.json"), {
      ...packageJson,
      "pi-pack": { ...packageJson["pi-pack"], "default-config": "../secret.ts" },
    });

    const result = await run(`pi-pack install ${source}`);

    expect(result.stderr).toContain(
      "pi-pack.default-config must be a safe relative path: ../secret.ts.",
    );
    expectFileTree(agentDir, { missing: ["extensions/escape-config"] });
  });
});

test("pi-pack install rejects symlinked default configs", async () => {
  await withTempDir(async ({ cwd, run }) => {
    const agentDir = path.join(cwd, "agent");
    const source = createExtensionPackage(cwd, "symlink-config");
    const defaultConfigPath = path.join(source, "src", "default-config.ts");
    const secretPath = path.join(cwd, "secret.ts");
    writeFileSync(secretPath, "export default 'secret';\n", "utf8");
    rmSync(defaultConfigPath);
    symlinkSync(secretPath, defaultConfigPath);

    const result = await run(`pi-pack install ${source}`);

    expect(result.stderr).toContain(
      "Default config must be a regular file inside the package: ./src/default-config.ts",
    );
    expectFileTree(agentDir, { missing: ["extensions/symlink-config"] });
  });
});
