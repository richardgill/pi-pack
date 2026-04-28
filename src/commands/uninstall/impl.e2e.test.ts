import { mkdirSync } from "node:fs";
import path from "node:path";
import { expect, test } from "vite-plus/test";
import { writeJson } from "~/lib/json";
import { createExtensionPackage } from "~/testing/extension-package";
import { expectFileTree } from "~/testing/fs";
import type { PromptHandler } from "~/testing/prompt-testing-types";
import { withTempDir } from "~/testing/temp-dir";

test("pi-pack uninstall interactively removes selected managed extensions", async () => {
  await withTempDir(async ({ cwd, run }) => {
    const agentDir = path.join(cwd, "agent");
    const filesSource = createExtensionPackage(cwd, "files");
    const tasksSource = createExtensionPackage(cwd, "tasks");
    await run(`pi-pack install ${filesSource}`);
    await run(`pi-pack install ${tasksSource}`);
    createUnmanagedExtension(agentDir, "manual");

    const promptHandler: PromptHandler = (prompt) => {
      if (prompt.type === "multiselect") {
        expect(prompt.options.map((option) => option.value)).toEqual(["files", "tasks"]);
        return ["files"];
      }
      if (prompt.type === "confirm") return true;
      throw new Error(`Unexpected prompt: ${prompt.type}`);
    };
    const result = await run("pi-pack uninstall", { promptHandler });

    expect(result.stdout).toContain("Will permanently delete:");
    expect(result.stdout).toContain("Removed files:");
    expectFileTree(agentDir, {
      files: {
        "extensions/tasks/config.ts": true,
        "extensions/manual/package.json": true,
      },
      missing: ["extensions/files"],
    });
  });
});

test("pi-pack uninstall keeps extensions when confirmation is rejected", async () => {
  await withTempDir(async ({ cwd, run }) => {
    const agentDir = path.join(cwd, "agent");
    const source = createExtensionPackage(cwd, "files");
    await run(`pi-pack install ${source}`);

    const promptHandler: PromptHandler = (prompt) => {
      if (prompt.type === "confirm") return false;
      throw new Error(`Unexpected prompt: ${prompt.type}`);
    };
    const result = await run("pi-pack uninstall files", { promptHandler });

    expect(result.stdout).toContain("No extensions uninstalled.");
    expectFileTree(agentDir, { files: { "extensions/files/config.ts": true } });
  });
});

test("pi-pack uninstall does not prompt when no managed extensions are installed", async () => {
  await withTempDir(async ({ run }) => {
    const promptHandler: PromptHandler = (prompt) => {
      throw new Error(`Unexpected prompt: ${prompt.type}`);
    };
    const result = await run("pi-pack uninstall", { promptHandler });

    expect(result.stdout).toContain("No extensions uninstalled.");
  });
});

test("pi-pack uninstall --yes removes named extensions without prompting", async () => {
  await withTempDir(async ({ cwd, run }) => {
    const agentDir = path.join(cwd, "agent");
    const source = createExtensionPackage(cwd, "files");
    await run(`pi-pack install ${source}`);

    const promptHandler: PromptHandler = (prompt) => {
      throw new Error(`Unexpected prompt: ${prompt.type}`);
    };
    const result = await run("pi-pack uninstall files --yes", { promptHandler });

    expect(result.stdout).toContain("Removed files:");
    expectFileTree(agentDir, { missing: ["extensions/files"] });
  });
});

test("pi-pack uninstall rejects unmanaged extension names", async () => {
  await withTempDir(async ({ cwd, run }) => {
    const agentDir = path.join(cwd, "agent");
    createUnmanagedExtension(agentDir, "manual");

    const result = await run("pi-pack uninstall manual --yes");

    expect(result.stderr).toContain(
      `Installed pi-pack extension not found: ${path.join(agentDir, "extensions", "manual")}`,
    );
    expectFileTree(agentDir, { files: { "extensions/manual/package.json": true } });
  });
});

test("pi-pack uninstall reports all required non-interactive inputs", async () => {
  await withTempDir(async ({ cwd, run }) => {
    const source = createExtensionPackage(cwd, "files");
    await run(`pi-pack install ${source}`);

    const result = await run("pi-pack uninstall");

    expect(result.stderr).toContain("Missing required non-interactive input:");
    expect(result.stderr).toContain("- <extension-name...>");
    expect(result.stderr).toContain("- --yes");
  });
});

test("pi-pack uninstall reports missing non-interactive confirmation", async () => {
  await withTempDir(async ({ cwd, run }) => {
    const source = createExtensionPackage(cwd, "files");
    await run(`pi-pack install ${source}`);

    const result = await run("pi-pack uninstall files");

    expect(result.stderr).toContain("Missing required non-interactive input:");
    expect(result.stderr).not.toContain("- <extension-name...>");
    expect(result.stderr).toContain("- --yes");
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
