import path from "node:path";
import { pathToFileURL } from "node:url";
import { expect, test } from "vite-plus/test";
import { withEnvVar } from "~/testing/env";
import { toPnpmDependency } from "./install-source";

type DependencyCase = {
  name: string;
  cwd: string;
  source: string;
  expected: string;
};

const cwd = path.join(path.sep, "workspace", "project");

const dependencyCases: DependencyCase[] = [
  {
    name: "strips npm prefix",
    cwd,
    source: "npm:@rich/files",
    expected: "@rich/files",
  },
  {
    name: "keeps bare package sources",
    cwd,
    source: "@rich/files",
    expected: "@rich/files",
  },
  {
    name: "resolves relative filesystem paths from cwd",
    cwd,
    source: "./extensions/files",
    expected: path.join(cwd, "extensions", "files"),
  },
  {
    name: "resolves relative file sources from cwd",
    cwd,
    source: "file:./extensions/files",
    expected: pathToFileURL(path.join(cwd, "extensions", "files")).href,
  },
  {
    name: "formats github git sources as pnpm github dependencies",
    cwd,
    source: "git:github.com/rich/files",
    expected: "github:rich/files",
  },
  {
    name: "preserves git refs in github dependencies",
    cwd,
    source: "git:github.com/rich/files@main",
    expected: "github:rich/files#main",
  },
  {
    name: "formats non-github git sources as git https dependencies",
    cwd,
    source: "git:gitlab.com/rich/files@v1.0.0",
    expected: "git+https://gitlab.com/rich/files.git#v1.0.0",
  },
];

dependencyCases.forEach(({ name, cwd: caseCwd, source, expected }) => {
  test(`toPnpmDependency ${name}`, async () => {
    await expect(toPnpmDependency(caseCwd, source)).resolves.toBe(expected);
  });
});

test("toPnpmDependency expands home-relative filesystem sources", async () => {
  const homeDir = path.join(path.sep, "users", "rich");

  await withEnvVar("HOME", homeDir, async () => {
    await expect(toPnpmDependency(cwd, "~/code/files")).resolves.toBe(
      path.join(homeDir, "code", "files"),
    );
  });
});

type UnsupportedExtensionCase = {
  name: string;
  source: string;
};

const unsupportedExtensionCases: UnsupportedExtensionCase[] = [
  { name: "rejects npm sources", source: "npm:@rich/files" },
  { name: "rejects bare package sources", source: "@rich/files" },
];

unsupportedExtensionCases.forEach(({ name, source }) => {
  test(`toPnpmDependency ${name} with --extension`, async () => {
    await expect(toPnpmDependency(cwd, source, "files")).rejects.toThrow(
      "--extension can only be used with git:, file:, or filesystem path sources.",
    );
  });
});
