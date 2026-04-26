import { mkdirSync } from "node:fs";
import path from "node:path";
import { expect, test } from "vite-plus/test";
import { writeJson } from "~/lib/json";
import { createExtensionPackage } from "~/testing/extension-package";
import { expectPathExists, expectPathMissing } from "~/testing/fs";
import { runPiPack } from "~/testing/pi-pack";
import type { PromptInfo, PromptResponse } from "~/testing/prompt-testing-types";
import { withTempDir } from "~/testing/temp-dir";

const runInstall = async (cwd: string, agentDir: string, args: string[]) =>
  runPiPack(cwd, agentDir, ["install", ...args]);

const runUninstall = async (
  cwd: string,
  agentDir: string,
  args: string[],
  promptHandler?: (prompt: PromptInfo) => PromptResponse,
) => runPiPack(cwd, agentDir, ["uninstall", ...args], promptHandler);

test("pi-pack uninstall interactively removes selected managed extensions", async () => {
  await withTempDir(async (cwd) => {
    const agentDir = path.join(cwd, "agent");
    const filesSource = createExtensionPackage(cwd, "files");
    const tasksSource = createExtensionPackage(cwd, "tasks");
    await runInstall(cwd, agentDir, [filesSource]);
    await runInstall(cwd, agentDir, [tasksSource]);
    createUnmanagedExtension(agentDir, "manual");

    const result = await runUninstall(cwd, agentDir, [], (prompt) => {
      if (prompt.type === "multiselect") {
        expect(prompt.options.map((option) => option.value)).toEqual(["files", "tasks"]);
        return ["files"];
      }
      if (prompt.type === "confirm") return true;
      throw new Error(`Unexpected prompt: ${prompt.type}`);
    });

    expect(result.stdout).toContain("Will permanently delete:");
    expect(result.stdout).toContain("Removed files:");
    expectPathMissing(agentDir, "extensions/files");
    expectPathExists(agentDir, "extensions/tasks/config.ts");
    expectPathExists(agentDir, "extensions/manual/package.json");
  });
});

test("pi-pack uninstall keeps extensions when confirmation is rejected", async () => {
  await withTempDir(async (cwd) => {
    const agentDir = path.join(cwd, "agent");
    const source = createExtensionPackage(cwd, "files");
    await runInstall(cwd, agentDir, [source]);

    const result = await runUninstall(cwd, agentDir, ["files"], (prompt) => {
      if (prompt.type === "confirm") return false;
      throw new Error(`Unexpected prompt: ${prompt.type}`);
    });

    expect(result.stdout).toContain("No extensions uninstalled.");
    expectPathExists(agentDir, "extensions/files/config.ts");
  });
});

test("pi-pack uninstall does not prompt when no managed extensions are installed", async () => {
  await withTempDir(async (cwd) => {
    const agentDir = path.join(cwd, "agent");

    const result = await runUninstall(cwd, agentDir, [], (prompt) => {
      throw new Error(`Unexpected prompt: ${prompt.type}`);
    });

    expect(result.stdout).toContain("No extensions uninstalled.");
  });
});

test("pi-pack uninstall --yes removes named extensions without prompting", async () => {
  await withTempDir(async (cwd) => {
    const agentDir = path.join(cwd, "agent");
    const source = createExtensionPackage(cwd, "files");
    await runInstall(cwd, agentDir, [source]);

    const result = await runUninstall(cwd, agentDir, ["files", "--yes"], (prompt) => {
      throw new Error(`Unexpected prompt: ${prompt.type}`);
    });

    expect(result.stdout).toContain("Removed files:");
    expectPathMissing(agentDir, "extensions/files");
  });
});

test("pi-pack uninstall rejects unmanaged extension names", async () => {
  await withTempDir(async (cwd) => {
    const agentDir = path.join(cwd, "agent");
    createUnmanagedExtension(agentDir, "manual");

    const result = await runUninstall(cwd, agentDir, ["manual", "--yes"]);

    expect(result.stderr).toContain(
      `Installed pi-pack extension not found: ${path.join(agentDir, "extensions", "manual")}`,
    );
    expectPathExists(agentDir, "extensions/manual/package.json");
  });
});

test("pi-pack uninstall errors without names or an interactive prompt", async () => {
  await withTempDir(async (cwd) => {
    const agentDir = path.join(cwd, "agent");
    const source = createExtensionPackage(cwd, "files");
    await runInstall(cwd, agentDir, [source]);

    const result = await runUninstall(cwd, agentDir, []);

    expect(result.stderr).toContain("Missing extension names");
  });
});

const createUnmanagedExtension = (agentDir: string, extensionName: string): void => {
  const root = path.join(agentDir, "extensions", extensionName);
  mkdirSync(root, { recursive: true });
  writeJson(path.join(root, "package.json"), {
    private: true,
    type: "module",
    dependencies: { [extensionName]: "1.0.0" },
  });
};
