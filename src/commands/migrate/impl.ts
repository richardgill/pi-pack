import type { LocalContext } from "~/context";
import { readmePath } from "~/readme-path";

export type MigrateFlags = Record<string, never>;

export type MigrateArgs = [];

export const runMigrate = (context: LocalContext, flags: MigrateFlags): void => {
  void flags;
  context.process.stdout.write(migrationInstructions());
};

const migrationInstructions = (): string =>
  `Read the pi-pack README first:
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
- Any existing config managed by a file should be removed. Instead use parameters in the function call exported by extension.ts.
- Update README install instructions for the chosen install source.

If this repo contains multiple pi extensions:
- Try to figure out which directory contains the extension packages. If unsure, ask the user (default: "extensions")
- In the monorepo root package.json:
  - pi-pack.extensions-dir = "<chosen extensions directory>"
- For each extension package, apply the standalone package changes above.

Preserve any existing pi resources. If the extension ships skills, prompts, or themes, expose them with resources_discover as shown in the pi-pack README.
`;
