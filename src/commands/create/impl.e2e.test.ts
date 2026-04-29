import path from "node:path";
import { expect, test } from "vite-plus/test";
import { writeJson } from "~/lib/json";
import { expectFileTree } from "~/testing/fs";
import { acceptDefault, type PromptHandler } from "~/testing/prompt-testing-types";
import { withTempDir } from "~/testing/temp-dir";

test("pi-pack create reports required non-interactive input", async () => {
  await withTempDir(async ({ run }) => {
    const result = await run("pi-pack create");

    expect(result.stderr).toContain("Missing required non-interactive input:");
    expect(result.stderr).toContain("- <name> or --mono <repo>");
  });
});

test("pi-pack create --mono reports the missing repo name", async () => {
  await withTempDir(async ({ run }) => {
    const result = await run("pi-pack create --mono");

    expect(result.stderr).toContain("Missing required non-interactive input:");
    expect(result.stderr).toContain("- <repo>");
  });
});

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
        "files/.gitignore": "node_modules/\n",
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
          json: { "pi-pack": { "extensions-dir": "packages" } },
        },
        "repo/README.md": {
          contains: ["cd repo/\npi-pack create"],
          notContains: "## Install with pi-pack",
        },
      },
      missing: ["packages/repo/package.json"],
    });
  });
});

const legacyPiExtensionCases = [
  {
    name: "pi.extensions",
    packageJson: { pi: { extensions: ["./extensions"] } },
  },
  {
    name: "pi package keyword",
    packageJson: { keywords: ["pi-package"] },
  },
];

legacyPiExtensionCases.forEach(({ name, packageJson }) => {
  test(`pi-pack create suggests running migrate for legacy extensions using ${name}`, async () => {
    await withTempDir(async ({ cwd, run }) => {
      writeJson(path.join(cwd, "package.json"), packageJson);

      const result = await run("pi-pack create");

      expect(result.stdout).toBe(
        [
          "This looks like an existing repo.",
          "",
          "To migrate an existing pi extension, ask your AI agent to run:",
          "",
          "  pi-pack migrate",
          "",
        ].join("\n"),
      );
      expectFileTree(cwd, { missing: ["pi-extensions/package.json"] });
    });
  });
});

test("pi-pack create suggests running migrate when a nested package has a pi extension keyword", async () => {
  await withTempDir(async ({ cwd, run }) => {
    writeJson(path.join(cwd, "package.json"), { name: "pi-extensions" });
    writeJson(path.join(cwd, "extensions/files/package.json"), { keywords: ["pi-extension"] });

    const result = await run("pi-pack create");

    expect(result.stdout).toBe(
      [
        "This looks like an existing repo.",
        "",
        "To migrate an existing pi extension, ask your AI agent to run:",
        "",
        "  pi-pack migrate",
        "",
      ].join("\n"),
    );
    expectFileTree(cwd, { missing: ["pi-extensions/package.json"] });
  });
});

test("pi-pack create files uses the configured extensions dir", async () => {
  await withTempDir(async ({ cwd, run }) => {
    writeJson(path.join(cwd, "package.json"), {
      "pi-pack": { "extensions-dir": "packages" },
    });

    await run("pi-pack create files");

    expectFileTree(cwd, {
      files: {
        "package.json": {
          json: { "pi-pack": { "extensions-dir": "packages" } },
        },
        "packages/files/package.json": true,
      },
    });
  });
});

test("pi-pack create files inside a monorepo prints the target hint", async () => {
  await withTempDir(async ({ cwd, run }) => {
    writeJson(path.join(cwd, "package.json"), {
      "pi-pack": { "extensions-dir": "packages" },
    });

    const result = await run("pi-pack create files");

    expect(result.stdout).toBe(
      "\nMonorepo detected — extension will be created at ./packages/files\n\nCreated extension package files at ./packages/files\n",
    );
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

test("pi-pack create rejects configured extension dirs that escape the cwd", async () => {
  await withTempDir(async ({ cwd, run }) => {
    writeJson(path.join(cwd, "package.json"), {
      "pi-pack": { "extensions-dir": "../escaped" },
    });

    const result = await run("pi-pack create files");

    expect(result.stderr).toContain(
      "pi-pack.extensions-dir must be a safe relative path: ../escaped.",
    );
    expectFileTree(cwd, { missing: ["../escaped/files/package.json"] });
  });
});

test("pi-pack create adds a second extension to the configured extensions dir", async () => {
  await withTempDir(async ({ cwd, run }) => {
    writeJson(path.join(cwd, "package.json"), {
      "pi-pack": { "extensions-dir": "extensions" },
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
      "pi-pack": { "extensions-dir": "extensions" },
    });

    const result = await run("pi-pack create", { promptHandler });

    expect(result.stdout).toBe(
      "\nMonorepo detected — extension will be created at ./extensions/tasks\n\nCreated extension package tasks at ./extensions/tasks\n",
    );
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
            "pi-pack": { "extensions-dir": "extensions" },
          },
        },
        "repo/.gitignore": "node_modules/\n",
        "repo/README.md": {
          contains: [
            "[`<extension-name>`](./extensions/<extension-name>/README.md)",
            "cd repo/\npi-pack create",
          ],
          notContains: "## Install with pi-pack",
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
          json: { "pi-pack": { "extensions-dir": "packages" } },
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

test("pi-pack create --mono-dir rejects dirs that escape the repo root", async () => {
  await withTempDir(async ({ cwd, run }) => {
    const result = await run("pi-pack create --mono repo --mono-dir ../packages");

    expect(result.stderr).toContain("Extensions dir must be a safe relative path: ../packages.");
    expectFileTree(cwd, { missing: ["packages/package.json"] });
  });
});

test("interactive pi-pack create --mono accepts the default repo name", async () => {
  const promptHandler: PromptHandler = (prompt) => {
    if (prompt.message === "Repo name") {
      expect(prompt).toMatchObject({ defaultValue: "pi-extensions", placeholder: "pi-extensions" });
      return acceptDefault;
    }
    if (prompt.message === "Extensions dir") return acceptDefault;
    if (prompt.message === "First extension name. e.g. preset") return "files";
    throw new Error(`Unexpected prompt: ${prompt.message}`);
  };

  await withTempDir(async ({ cwd, run }) => {
    await run("pi-pack create --mono", { promptHandler });

    expectFileTree(cwd, {
      files: {
        "pi-extensions/package.json": true,
        "pi-extensions/extensions/files/package.json": true,
      },
    });
  });
});

test("interactive pi-pack create prompts for an optional first extension name without a default", async () => {
  const promptHandler: PromptHandler = (prompt) => {
    if (prompt.message === "What do you want to create?") return "mono";
    if (prompt.message === "Repo name") return "repo";
    if (prompt.message === "Extensions dir") return acceptDefault;
    if (prompt.message === "First extension name. e.g. preset") {
      expect(prompt).toEqual({ type: "text", message: "First extension name. e.g. preset" });
      return "files";
    }
    throw new Error(`Unexpected prompt: ${prompt.message}`);
  };

  await withTempDir(async ({ cwd, run }) => {
    await run("pi-pack create", { promptHandler });

    expectFileTree(cwd, { files: { "repo/extensions/files/package.json": true } });
  });
});

test("interactive pi-pack create can create a monorepo with a first extension", async () => {
  const promptHandler: PromptHandler = (prompt) => {
    if (prompt.message === "What do you want to create?") return "mono";
    if (prompt.message === "Repo name") return "repo";
    if (prompt.message === "Extensions dir") return acceptDefault;
    if (prompt.message === "First extension name. e.g. preset") return "files";
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
          json: { "pi-pack": { "extensions-dir": "extensions" } },
        },
        "repo/extensions/files/package.json": true,
        "repo/extensions/files/src/extension.ts": true,
        "repo/extensions/files/.gitignore": "node_modules/\n",
        "repo/README.md": {
          contains: "[`files`](./extensions/files/README.md)",
          notContains: "## Install with pi-pack",
        },
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
    if (prompt.message === "Extensions dir") return acceptDefault;
    if (prompt.message === "First extension name. e.g. preset") return "dir/files";
    throw new Error(`Unexpected prompt: ${prompt.message}`);
  };

  await withTempDir(async ({ cwd, run }) => {
    const result = await run("pi-pack create", { promptHandler });

    expect(result.stderr).toContain(
      "Extension name must be a single filesystem path segment: dir/files.",
    );
    expectFileTree(cwd, { missing: ["repo/extensions/dir/files/package.json"] });
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
    if (prompt.message === "Extensions dir") return acceptDefault;
    if (prompt.message === "First extension name. e.g. preset") return "files";
    throw new Error(`Unexpected prompt: ${prompt.message}`);
  };

  await withTempDir(async ({ cwd, run }) => {
    await run("pi-pack create --mono", { promptHandler });

    expectFileTree(cwd, {
      files: {
        "repo/package.json": {
          json: { "pi-pack": { "extensions-dir": "extensions" } },
        },
        "repo/extensions/files/package.json": true,
      },
    });
  });
});

test("interactive pi-pack create --mono-dir prompts for the repo and first extension names", async () => {
  const promptHandler: PromptHandler = (prompt) => {
    if (prompt.message === "Repo name") return "repo";
    if (prompt.message === "First extension name. e.g. preset") return "files";
    throw new Error(`Unexpected prompt: ${prompt.message}`);
  };

  await withTempDir(async ({ cwd, run }) => {
    await run("pi-pack create --mono-dir packages", { promptHandler });

    expectFileTree(cwd, {
      files: {
        "repo/package.json": {
          json: { "pi-pack": { "extensions-dir": "packages" } },
        },
        "repo/packages/files/package.json": true,
      },
    });
  });
});
