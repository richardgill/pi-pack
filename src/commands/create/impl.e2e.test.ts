import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "vite-plus/test";
import { readJson, writeJson } from "~/lib/json";
import { expectDirExists, expectPathExists, expectPathMissing } from "~/testing/fs";
import { runPiPack } from "~/testing/pi-pack";
import { acceptDefault, type PromptHandler } from "~/testing/prompt-testing-types";
import { withTempDir } from "~/testing/temp-dir";

const runCreate = async (cwd: string, args: string[], promptHandler?: PromptHandler) =>
  runPiPack(cwd, path.join(cwd, "agent"), ["create", ...args], promptHandler);

test("pi-pack create files creates a single extension package", async () => {
  await withTempDir(async (cwd) => {
    const result = await runCreate(cwd, ["files"]);

    expect(result.stdout).toBe("\nCreated extension package files at ./files\n");
    expect(readJson(path.join(cwd, "files/package.json"))).toMatchObject({
      name: "files",
      "pi-pack": { "default-config": "./src/default-config.ts" },
    });
    expectPathExists(cwd, "files/src/extension.ts");
    expectPathExists(cwd, "files/src/default-config.ts");
    expect(readFileSync(path.join(cwd, "files/README.md"), "utf8")).toContain(
      'pi-pack install "npm:files"',
    );
    expect(readFileSync(path.join(cwd, "files/README.md"), "utf8")).toContain(
      'import { extension } from "files";',
    );
    expect(readFileSync(path.join(cwd, "files/README.md"), "utf8")).not.toContain("@v1");
    expectPathMissing(cwd, "package.json");
  });
});

test("pi-pack create --mono-dir packages repo infers a monorepo root", async () => {
  await withTempDir(async (cwd) => {
    await runCreate(cwd, ["--mono-dir", "packages", "repo"]);

    expect(readJson(path.join(cwd, "repo/package.json"))).toMatchObject({
      "pi-pack": { "extensions-folder": "packages" },
    });
    expectDirExists(cwd, "repo/packages");
    expect(readFileSync(path.join(cwd, "repo/README.md"), "utf8")).toContain(
      'pi-pack install "npm:<extension-name>"',
    );
    expect(readFileSync(path.join(cwd, "repo/README.md"), "utf8")).toContain(
      'pi-pack install "git:github.com/<user>/repo" --extension "<extension-name>"',
    );
    expect(readFileSync(path.join(cwd, "repo/README.md"), "utf8")).toContain(
      "cd repo/\npi-pack create",
    );
    expectPathMissing(cwd, "packages/repo/package.json");
  });
});

test("pi-pack create files uses the configured extensions folder", async () => {
  await withTempDir(async (cwd) => {
    writeJson(path.join(cwd, "package.json"), {
      "pi-pack": { "extensions-folder": "packages" },
    });

    await runCreate(cwd, ["files"]);

    expect(readJson(path.join(cwd, "package.json"))).toMatchObject({
      "pi-pack": { "extensions-folder": "packages" },
    });
    expectPathExists(cwd, "packages/files/package.json");
  });
});

test("pi-pack create rejects path-like extension names", async () => {
  await withTempDir(async (cwd) => {
    const result = await runCreate(cwd, ["../escaped"]);

    expect(result.stderr).toContain(
      "Extension name must be a single filesystem path segment: ../escaped.",
    );
    expectPathMissing(cwd, "../escaped/package.json");
  });
});

test("pi-pack create rejects configured extension folders that escape the cwd", async () => {
  await withTempDir(async (cwd) => {
    writeJson(path.join(cwd, "package.json"), {
      "pi-pack": { "extensions-folder": "../escaped" },
    });

    const result = await runCreate(cwd, ["files"]);

    expect(result.stderr).toContain(
      "pi-pack.extensions-folder must be a safe relative path: ../escaped.",
    );
    expectPathMissing(cwd, "../escaped/files/package.json");
  });
});

test("pi-pack create adds a second extension to the configured extensions folder", async () => {
  await withTempDir(async (cwd) => {
    writeJson(path.join(cwd, "package.json"), {
      "pi-pack": { "extensions-folder": "extensions" },
    });

    await runCreate(cwd, ["files"]);
    await runCreate(cwd, ["tasks"]);

    expectPathExists(cwd, "extensions/files/package.json");
    expectPathExists(cwd, "extensions/tasks/package.json");
    expect(readFileSync(path.join(cwd, "extensions/tasks/README.md"), "utf8")).toContain(
      "Part of [`pi-pack-",
    );
  });
});

test("interactive pi-pack create inside a monorepo prompts for an extension name", async () => {
  const promptHandler: PromptHandler = (prompt) => {
    if (prompt.message === "Extension name. e.g. pi-preset") return "tasks";
    throw new Error(`Unexpected prompt: ${prompt.message}`);
  };

  await withTempDir(async (cwd) => {
    writeJson(path.join(cwd, "package.json"), {
      "pi-pack": { "extensions-folder": "extensions" },
    });

    const result = await runCreate(cwd, [], promptHandler);

    expect(result.stdout).toBe("\nCreated extension package tasks at ./extensions/tasks\n");
    expectPathExists(cwd, "extensions/tasks/package.json");
  });
});

test("pi-pack create --mono repo creates a monorepo root", async () => {
  await withTempDir(async (cwd) => {
    const result = await runCreate(cwd, ["--mono", "repo"]);

    expect(result.stdout).toBe("\nCreated extension monorepo:\n\n  Repo: ./repo\n");
    expect(readJson(path.join(cwd, "repo/package.json"))).toMatchObject({
      name: "repo",
      private: true,
      "pi-pack": { "extensions-folder": "extensions" },
    });
    expectDirExists(cwd, "repo/extensions");
    expect(readFileSync(path.join(cwd, "repo/README.md"), "utf8")).toContain(
      "[`<extension-name>`](./extensions/<extension-name>/README.md)",
    );
    expect(readFileSync(path.join(cwd, "repo/README.md"), "utf8")).toContain(
      'pi-pack install "npm:<extension-name>"',
    );
    expect(readFileSync(path.join(cwd, "repo/README.md"), "utf8")).toContain(
      "cd repo/\npi-pack create",
    );
  });
});

test("pi-pack create --mono repo --mono-dir packages creates a custom monorepo root", async () => {
  await withTempDir(async (cwd) => {
    await runCreate(cwd, ["--mono", "repo", "--mono-dir", "packages"]);

    expect(readJson(path.join(cwd, "repo/package.json"))).toMatchObject({
      "pi-pack": { "extensions-folder": "packages" },
    });
    expectDirExists(cwd, "repo/packages");
  });
});

test("pi-pack create --mono rejects path-like repo names", async () => {
  await withTempDir(async (cwd) => {
    const result = await runCreate(cwd, ["--mono", "../repo"]);

    expect(result.stderr).toContain("Repo name must be a single filesystem path segment: ../repo.");
    expectPathMissing(cwd, "../repo/package.json");
  });
});

test("pi-pack create --mono-dir rejects folders that escape the repo root", async () => {
  await withTempDir(async (cwd) => {
    const result = await runCreate(cwd, ["--mono", "repo", "--mono-dir", "../packages"]);

    expect(result.stderr).toContain("Extensions folder must be a safe relative path: ../packages.");
    expectPathMissing(cwd, "packages/package.json");
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

  await withTempDir(async (cwd) => {
    const result = await runCreate(cwd, [], promptHandler);

    expect(result.stdout).toBe(
      "\nCreated extension monorepo:\n\n  Repo:            ./repo\n  First extension: ./repo/extensions/files\n",
    );
    expect(readJson(path.join(cwd, "repo/package.json"))).toMatchObject({
      "pi-pack": { "extensions-folder": "extensions" },
    });
    expectPathExists(cwd, "repo/extensions/files/package.json");
    expectPathExists(cwd, "repo/extensions/files/src/extension.ts");
    expect(readFileSync(path.join(cwd, "repo/README.md"), "utf8")).toContain(
      "[`files`](./extensions/files/README.md)",
    );
    expect(readFileSync(path.join(cwd, "repo/extensions/files/README.md"), "utf8")).toContain(
      "Part of [`repo`](../../README.md).",
    );
    expect(readFileSync(path.join(cwd, "repo/extensions/files/README.md"), "utf8")).toContain(
      'pi-pack install "npm:files"',
    );
    expect(readFileSync(path.join(cwd, "repo/extensions/files/README.md"), "utf8")).toContain(
      'pi-pack install "git:github.com/<user>/repo" --extension "files"',
    );
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

  await withTempDir(async (cwd) => {
    const result = await runCreate(cwd, [], promptHandler);

    expect(result.stderr).toContain(
      "Extension name must be a single filesystem path segment: folder/files.",
    );
    expectPathMissing(cwd, "repo/extensions/folder/files/package.json");
  });
});

test("interactive pi-pack create can create an extension package", async () => {
  const promptHandler: PromptHandler = (prompt) => {
    if (prompt.message === "What do you want to create?") return "extension";
    if (prompt.message === "Extension name. e.g. pi-preset") return "files";
    throw new Error(`Unexpected prompt: ${prompt.message}`);
  };

  await withTempDir(async (cwd) => {
    await runCreate(cwd, [], promptHandler);

    expectPathExists(cwd, "files/package.json");
    expectPathExists(cwd, "files/src/extension.ts");
    expectPathExists(cwd, "files/src/default-config.ts");
    expectPathMissing(cwd, "package.json");
  });
});

test("interactive pi-pack create --mono prompts for the repo and first extension names", async () => {
  const promptHandler: PromptHandler = (prompt) => {
    if (prompt.message === "Repo name") return "repo";
    if (prompt.message === "Extensions folder") return acceptDefault;
    if (prompt.message === "First extension name. e.g. pi-preset") return "files";
    throw new Error(`Unexpected prompt: ${prompt.message}`);
  };

  await withTempDir(async (cwd) => {
    await runCreate(cwd, ["--mono"], promptHandler);

    expect(readJson(path.join(cwd, "repo/package.json"))).toMatchObject({
      "pi-pack": { "extensions-folder": "extensions" },
    });
    expectPathExists(cwd, "repo/extensions/files/package.json");
  });
});

test("interactive pi-pack create --mono-dir prompts for the repo and first extension names", async () => {
  const promptHandler: PromptHandler = (prompt) => {
    if (prompt.message === "Repo name") return "repo";
    if (prompt.message === "First extension name. e.g. pi-preset") return "files";
    throw new Error(`Unexpected prompt: ${prompt.message}`);
  };

  await withTempDir(async (cwd) => {
    await runCreate(cwd, ["--mono-dir", "packages"], promptHandler);

    expect(readJson(path.join(cwd, "repo/package.json"))).toMatchObject({
      "pi-pack": { "extensions-folder": "packages" },
    });
    expectPathExists(cwd, "repo/packages/files/package.json");
  });
});
