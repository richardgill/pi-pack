import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "vite-plus/test";
import { runPiPack } from "~/testing/pi-pack";
import { withTempDir } from "~/testing/temp-dir";

const packageJson = JSON.parse(readFileSync("package.json", "utf8"));

const commandOrder = [
  "pi-pack install [--extension <extension-name>] [--as <extension-folder>] <source>",
  "pi-pack upgrade [--bump] [extension-name...]",
  "pi-pack uninstall [--yes] [extension-name...]",
  "pi-pack create [--mono-dir <extensions-folder>] [--mono] [name]",
];

test("pi-pack prints the same help as pi-pack --help", async () => {
  await withTempDir(async (cwd) => {
    const agentDir = path.join(cwd, "agent");
    const result = await runPiPack(cwd, agentDir, []);
    const helpResult = await runPiPack(cwd, agentDir, ["--help"]);

    expect(result.stderr).toBe("");
    expect(helpResult.stderr).toBe("");
    expect(result.stdout).toBe(helpResult.stdout);
    expect(result.stdout).toContain("INSTALL SOURCES");
    expect(result.stdout).toContain("npm:<pkg>[@version]");
    expect(result.stdout).toContain("file:<path> | ./path | ../path | ~/path | /path");
  });
});

test("pi-pack help does not duplicate help and version in usage", async () => {
  await withTempDir(async (cwd) => {
    const result = await runPiPack(cwd, path.join(cwd, "agent"), []);

    expect(result.stdout).not.toContain("pi-pack --help");
    expect(result.stdout).not.toContain("pi-pack --version");
    expect(result.stdout).toContain("-h --help");
    expect(result.stdout).toContain("-v --version");
  });
});

test("pi-pack help orders commands by install flow", async () => {
  await withTempDir(async (cwd) => {
    const result = await runPiPack(cwd, path.join(cwd, "agent"), []);
    const indexes = commandOrder.map((command) => result.stdout.indexOf(command));

    expect(indexes.every((index) => index >= 0)).toBe(true);
    expect(indexes).toEqual([...indexes].sort((left, right) => left - right));
  });
});

test("pi-pack --version prints the package version in dev", async () => {
  await withTempDir(async (cwd) => {
    const result = await runPiPack(cwd, path.join(cwd, "agent"), ["--version"]);

    expect(result.stdout.trim()).toBe(packageJson.version);
  });
});
