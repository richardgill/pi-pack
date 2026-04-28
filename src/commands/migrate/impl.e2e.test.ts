import { expect, test } from "vite-plus/test";
import { readmePath } from "~/readme-path";
import { withTempDir } from "~/testing/temp-dir";

const expectedInstructions = `Read the pi-pack README first:
  ${readmePath}

If this repo is a standalone pi extension:
- Make it an npm package.
- Move/register extension code behind an exported configurable function.
  - Remove any config parsing to be parameters of the function
- Add ./src/default-config.ts that imports this package and exports that function call.
- In package.json:
  - exports["."] = "./src/extension.ts"
  - keywords includes "pi-package"
  - pi-pack.default-config = "./src/default-config.ts"
  - pi-pack.requires-config-edit = default: true, or false if the extension has no configuration options
- Ask the user how people should install this extension: npm, GitHub, or local file path.
- Update README install instructions for the chosen install source.

If this repo contains multiple pi extensions:
- Try to figure out which directory contains the extension packages. If unsure, ask the user (default: "extensions")
- In the monorepo root package.json:
  - pi-pack.extensions-dir = "<chosen extensions directory>"
- For each extension package, apply the standalone package changes above.

Preserve any existing pi resources. If the extension ships skills, prompts, or themes, expose them with resources_discover as shown in the pi-pack README.
`;

const expectedHelp = `USAGE
  pi-pack migrate
  pi-pack migrate --help

Print AI migration instructions for existing pi extensions

FLAGS
  -h --help  Print help information and exit
`;

test("pi-pack migrate prints AI migration instructions", async () => {
  await withTempDir(async ({ run }) => {
    const result = await run("pi-pack migrate");

    expect(result.stderr).toBe("");
    expect(result.stdout).toBe(expectedInstructions);
  });
});

test("pi-pack migrate --help prints help", async () => {
  await withTempDir(async ({ run }) => {
    const result = await run("pi-pack migrate --help");

    expect(result.stderr).toBe("");
    expect(result.stdout).toBe(expectedHelp);
  });
});
