import path from "node:path";
import { expect, test } from "vite-plus/test";
import { writeJson } from "~/lib/json";
import { expectFileTree } from "~/testing/fs";
import { acceptDefault, type PromptHandler } from "~/testing/prompt-testing-types";
import { withTempDir } from "~/testing/temp-dir";

test("pi-pack create files creates a single extension package", async () => {
  await withTempDir(async ({ cwd, run }) => {
    const result = await run("pi-pack create files");

    expect(result.stdout).toBe("\nCreated extension package files at ./files\n");
    expectFileTree(cwd, {
      files: {
        "files/package.json": {
          json: {
            name: "files",
            "pi-pack": { "default-config": "./src/default-config.ts" },
          },
        },
        "files/src/extension.ts": true,
        "files/src/default-config.ts": true,
        "files/README.md": {
          contains: ['pi-pack install "npm:files"', 'import { extension } from "files";'],
          notContains: "@v1",
        },
      },
      missing: ["package.json"],
    });
  });
});

test("pi-pack create --mono-dir packages repo infers a monorepo root", async () => {
  await withTempDir(async ({ cwd, run }) => {
    await run("pi-pack create --mono-dir packages repo");

    expectFileTree(cwd, {
      dirs: ["repo/packages"],
      files: {
        "repo/package.json": {
          json: { "pi-pack": { "extensions-folder": "packages" } },
        },
        "repo/README.md": {
          contains: [
            'pi-pack install "npm:<extension-name>"',
            'pi-pack install "git:github.com/<user>/repo" --extension "<extension-name>"',
            "cd repo/\npi-pack create",
          ],
        },
      },
      missing: ["packages/repo/package.json"],
    });
  });
});

test("pi-pack create files uses the configured extensions folder", async () => {
  await withTempDir(async ({ cwd, run }) => {
    writeJson(path.join(cwd, "package.json"), {
      "pi-pack": { "extensions-folder": "packages" },
    });

    await run("pi-pack create files");

    expectFileTree(cwd, {
      files: {
        "package.json": {
          json: { "pi-pack": { "extensions-folder": "packages" } },
        },
        "packages/files/package.json": true,
      },
    });
  });
});

test("pi-pack create rejects path-like extension names", async () => {
  await withTempDir(async ({ cwd, run }) => {
    const result = await run("pi-pack create ../escaped");

    expect(result.stderr).toContain(
      "Extension name must be a single filesystem path segment: ../escaped.",
    );
    expectFileTree(cwd, { missing: ["../escaped/package.json"] });
  });
});

test("pi-pack create rejects configured extension folders that escape the cwd", async () => {
  await withTempDir(async ({ cwd, run }) => {
    writeJson(path.join(cwd, "package.json"), {
      "pi-pack": { "extensions-folder": "../escaped" },
    });

    const result = await run("pi-pack create files");

    expect(result.stderr).toContain(
      "pi-pack.extensions-folder must be a safe relative path: ../escaped.",
    );
    expectFileTree(cwd, { missing: ["../escaped/files/package.json"] });
  });
});

test("pi-pack create adds a second extension to the configured extensions folder", async () => {
  await withTempDir(async ({ cwd, run }) => {
    writeJson(path.join(cwd, "package.json"), {
      "pi-pack": { "extensions-folder": "extensions" },
    });

    await run("pi-pack create files");
    await run("pi-pack create tasks");

    expectFileTree(cwd, {
      files: {
        "extensions/files/package.json": true,
        "extensions/tasks/package.json": true,
        "extensions/tasks/README.md": { contains: "Part of [`pi-pack-" },
      },
    });
  });
});

test("interactive pi-pack create inside a monorepo prompts for an extension name", async () => {
  const promptHandler: PromptHandler = (prompt) => {
    if (prompt.message === "Extension name. e.g. pi-preset") return "tasks";
    throw new Error(`Unexpected prompt: ${prompt.message}`);
  };

  await withTempDir(async ({ cwd, run }) => {
    writeJson(path.join(cwd, "package.json"), {
      "pi-pack": { "extensions-folder": "extensions" },
    });

    const result = await run("pi-pack create", { promptHandler });

    expect(result.stdout).toBe("\nCreated extension package tasks at ./extensions/tasks\n");
    expectFileTree(cwd, { files: { "extensions/tasks/package.json": true } });
  });
});

test("pi-pack create --mono repo creates a monorepo root", async () => {
  await withTempDir(async ({ cwd, run }) => {
    const result = await run("pi-pack create --mono repo");

    expect(result.stdout).toBe("\nCreated extension monorepo:\n\n  Repo: ./repo\n");
    expectFileTree(cwd, {
      dirs: ["repo/extensions"],
      files: {
        "repo/package.json": {
          json: {
            name: "repo",
            private: true,
            "pi-pack": { "extensions-folder": "extensions" },
          },
        },
        "repo/README.md": {
          contains: [
            "[`<extension-name>`](./extensions/<extension-name>/README.md)",
            'pi-pack install "npm:<extension-name>"',
            "cd repo/\npi-pack create",
          ],
        },
      },
    });
  });
});

test("pi-pack create --mono repo --mono-dir packages creates a custom monorepo root", async () => {
  await withTempDir(async ({ cwd, run }) => {
    await run("pi-pack create --mono repo --mono-dir packages");

    expectFileTree(cwd, {
      dirs: ["repo/packages"],
      files: {
        "repo/package.json": {
          json: { "pi-pack": { "extensions-folder": "packages" } },
        },
      },
    });
  });
});

test("pi-pack create --mono rejects path-like repo names", async () => {
  await withTempDir(async ({ cwd, run }) => {
    const result = await run("pi-pack create --mono ../repo");

    expect(result.stderr).toContain("Repo name must be a single filesystem path segment: ../repo.");
    expectFileTree(cwd, { missing: ["../repo/package.json"] });
  });
});

test("pi-pack create --mono-dir rejects folders that escape the repo root", async () => {
  await withTempDir(async ({ cwd, run }) => {
    const result = await run("pi-pack create --mono repo --mono-dir ../packages");

    expect(result.stderr).toContain("Extensions folder must be a safe relative path: ../packages.");
    expectFileTree(cwd, { missing: ["packages/package.json"] });
  });
});

test("interactive pi-pack create can create a monorepo with a first extension", async () => {
  const promptHandler: PromptHandler = (prompt) => {
    if (prompt.message === "What do you want to create?") return "mono";
    if (prompt.message === "Repo name") return "repo";
    if (prompt.message === "Extensions folder") return acceptDefault;
    if (prompt.message === "First extension name. e.g. pi-preset") return "files";
    throw new Error(`Unexpected prompt: ${prompt.message}`);
  };

  await withTempDir(async ({ cwd, run }) => {
    const result = await run("pi-pack create", { promptHandler });

    expect(result.stdout).toBe(
      "\nCreated extension monorepo:\n\n  Repo:            ./repo\n  First extension: ./repo/extensions/files\n",
    );
    expectFileTree(cwd, {
      files: {
        "repo/package.json": {
          json: { "pi-pack": { "extensions-folder": "extensions" } },
        },
        "repo/extensions/files/package.json": true,
        "repo/extensions/files/src/extension.ts": true,
        "repo/README.md": { contains: "[`files`](./extensions/files/README.md)" },
        "repo/extensions/files/README.md": {
          contains: [
            "Part of [`repo`](../../README.md).",
            'pi-pack install "npm:files"',
            'pi-pack install "git:github.com/<user>/repo" --extension "files"',
          ],
        },
      },
    });
  });
});

test("interactive pi-pack create rejects path-like first extension names", async () => {
  const promptHandler: PromptHandler = (prompt) => {
    if (prompt.message === "What do you want to create?") return "mono";
    if (prompt.message === "Repo name") return "repo";
    if (prompt.message === "Extensions folder") return acceptDefault;
    if (prompt.message === "First extension name. e.g. pi-preset") return "folder/files";
    throw new Error(`Unexpected prompt: ${prompt.message}`);
  };

  await withTempDir(async ({ cwd, run }) => {
    const result = await run("pi-pack create", { promptHandler });

    expect(result.stderr).toContain(
      "Extension name must be a single filesystem path segment: folder/files.",
    );
    expectFileTree(cwd, { missing: ["repo/extensions/folder/files/package.json"] });
  });
});

test("interactive pi-pack create can create an extension package", async () => {
  const promptHandler: PromptHandler = (prompt) => {
    if (prompt.message === "What do you want to create?") return "extension";
    if (prompt.message === "Extension name. e.g. pi-preset") return "files";
    throw new Error(`Unexpected prompt: ${prompt.message}`);
  };

  await withTempDir(async ({ cwd, run }) => {
    await run("pi-pack create", { promptHandler });

    expectFileTree(cwd, {
      files: {
        "files/package.json": true,
        "files/src/extension.ts": true,
        "files/src/default-config.ts": true,
      },
      missing: ["package.json"],
    });
  });
});

test("interactive pi-pack create --mono prompts for the repo and first extension names", async () => {
  const promptHandler: PromptHandler = (prompt) => {
    if (prompt.message === "Repo name") return "repo";
    if (prompt.message === "Extensions folder") return acceptDefault;
    if (prompt.message === "First extension name. e.g. pi-preset") return "files";
    throw new Error(`Unexpected prompt: ${prompt.message}`);
  };

  await withTempDir(async ({ cwd, run }) => {
    await run("pi-pack create --mono", { promptHandler });

    expectFileTree(cwd, {
      files: {
        "repo/package.json": {
          json: { "pi-pack": { "extensions-folder": "extensions" } },
        },
        "repo/extensions/files/package.json": true,
      },
    });
  });
});

test("interactive pi-pack create --mono-dir prompts for the repo and first extension names", async () => {
  const promptHandler: PromptHandler = (prompt) => {
    if (prompt.message === "Repo name") return "repo";
    if (prompt.message === "First extension name. e.g. pi-preset") return "files";
    throw new Error(`Unexpected prompt: ${prompt.message}`);
  };

  await withTempDir(async ({ cwd, run }) => {
    await run("pi-pack create --mono-dir packages", { promptHandler });

    expectFileTree(cwd, {
      files: {
        "repo/package.json": {
          json: { "pi-pack": { "extensions-folder": "packages" } },
        },
        "repo/packages/files/package.json": true,
      },
    });
  });
});
