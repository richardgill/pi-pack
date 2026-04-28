import { readFileSync } from "node:fs";
import { expect, test } from "vite-plus/test";
import { withTempDir } from "~/testing/temp-dir";

const packageJson = JSON.parse(readFileSync("package.json", "utf8"));

const expectedHelp = `USAGE
  pi-pack install [--extension <extension-name>] [--as <extension-dir>] <source>
  pi-pack upgrade [--bump] [extension-name...]
  pi-pack uninstall [--yes] [extension-name...]
  pi-pack create [--mono-dir <extensions-dir>] [--mono] [name]
  pi-pack migrate

A packaging system for pi extensions

INSTALL SOURCES
  npm:<pkg>[@version]
  git:<host>/<repo>[@ref]
  file:<path> | ./path | ../path | ~/path | /path

FLAGS
  -h --help     Print help information and exit
  -v --version  Print version information and exit
  --verbose     Show verbose logging

COMMANDS
  install    Install an extension package
  upgrade    Upgrade installed extensions
  uninstall  Uninstall installed extensions
  create     Create an extension package
  migrate    Print AI migration instructions for existing pi extensions
`;

test("pi-pack prints help", async () => {
  await withTempDir(async ({ run }) => {
    const result = await run("pi-pack");
    const helpResult = await run("pi-pack --help");

    expect(result.stderr).toBe("");
    expect(helpResult.stderr).toBe("");
    expect(result.stdout).toBe(expectedHelp);
    expect(helpResult.stdout).toBe(expectedHelp);
  });
});

test("pi-pack --version prints the package version in dev", async () => {
  await withTempDir(async ({ run }) => {
    const result = await run("pi-pack --version");

    expect(result.stdout.trim()).toBe(packageJson.version);
  });
});
