<p align="center">
  <a href="https://www.npmjs.com/package/pi-pack"><img src="https://img.shields.io/npm/v/pi-pack.svg?label=version" alt="npm package"></a>
  <a href="https://github.com/richardgill/pi-pack/blob/main/LICENSE"><img src="https://img.shields.io/npm/l/pi-pack.svg" alt="license"></a>
  <a href="https://github.com/richardgill/pi-pack/actions/workflows/ci.yml"><img src="https://github.com/richardgill/pi-pack/actions/workflows/ci.yml/badge.svg?branch=main" alt="build status"></a>
</p>

# pi-pack

A packaging system for [pi](https://github.com/badlogic/pi-mono) extensions.

pi-pack extensions are configured by calling a typescript function with extension options:

```ts
// ~/.pi/agent/extensions/fancy-extension/config.ts

import { extension } from "fancy-extension";

export default extension({
  // set configuration here
  option1: "value",
  option2: (x) => `${x + 1}`,
});

```
## Getting started 

### Install `pi-pack`
```bash
npm install -g pi-pack
```

### Install an extension

```bash
pi-pack install git:github.com/richardgill/pi-pack-example
```

Installs into: `~/.pi/agent/extensions/pi-pack-example`

Edit the config to configure the extension:

```ts
// ~/.pi/agent/extensions/pi-pack-example/config.ts

import { piPackExample } from "pi-pack-example";

export default piPackExample({
  // set configuration here
  commandName: "pi-pack-example",
  message: "This extension was configured from config.ts.",
});
```

[Example extension](https://github.com/richardgill/pi-pack-example)



## Installing pi-pack extensions

```bash
# From github repo
pi-pack install "git:github.com/user/repo"
pi-pack install "git:github.com/user/repo@v1" # pin git ref: tag, branch, or commit
pi-pack install "git:github.com/user/mono-repo" --extension "extension-name" # from a github monorepo

# From npm
pi-pack install "npm:foo-bar"
pi-pack install "npm:foo-bar@1.0.0" # pin version
pi-pack install "npm:foo-bar" --as "baz" # install into ~/.pi/agent/extensions/baz

# From local file system
pi-pack install "~/code/my-extension"
pi-pack install "~/code/my-extension-mono-repo" --extension "files"
```

pi-pack uses [pnpm](https://pnpm.io) under the hood, and supports most of pnpm's [package sources](https://pnpm.io/package-sources).

## Upgrading extensions

`pi-pack upgrade` upgrades installed extensions while preserving your local `config.ts` config.

```bash
pi-pack upgrade # upgrades all pi-pack extensions
pi-pack upgrade "extension-name" # upgrade single extension
```

By default, upgrades respect the dependency range recorded in each extension's `package.json`.

`--bump` upgrades to the latest available version and rewrites the dependency spec in the extension's `package.json`:

```bash
pi-pack upgrade --bump
pi-pack upgrade "extension-name" --bump
```

## Uninstalling extensions

```bash
pi-pack uninstall              # uninstall pi-pack extensions interactively
pi-pack uninstall files tasks  # remove named extensions after confirmation
pi-pack uninstall files --yes  # skip confirmation
```

Uninstall permanently deletes the extension dirs, including `config.ts`.
Only pi-pack managed extensions are shown or removed.

## What `pi-pack install` does

```bash
pi-pack install "git:github.com/richardgill/pi-pack-example"
```

Installs the extension to: 
```
~/.pi/agent/extensions/pi-pack-example/
├── config.ts
└── package.json
```

```ts
// config.ts

import { piPackExample } from "pi-pack-example";

export default piPackExample({
  // user makes edits here
  commandName: "pi-pack-example",
  message: "This extension was configured from config.ts.",
});
```

```json5
// package.json
{
  "private": true,
  "type": "module",
  "dependencies": {
    "pi-pack-example": "github:richardgill/pi-pack-example"
  },
  "pi": {
    "extensions": ["./config.ts"]
  },
  "pi-pack": {
    "managed": true
  }
}
```

Extensions are installed via `pnpm`. 

## Building an extension

pi-pack extensions repos are simple npm packages:

- They export a function users will call to configure the extension 
- They provide a default config that will be copied into: `~/.pi/agent/extensions/<extension-name>/config.ts` 
- They can bundle pi resources like skills, prompt templates, and themes

### Create an extension

Run `pi-pack create` to create an extension.

`pi-pack create <name>` creates a single extension package dir.

#### Single repo extensions

[Example pi-pack extension](https://github.com/richardgill/pi-pack-example)

```txt
repo/
├── package.json
└── src/
    ├── extension.ts
    └── default-config.ts
```

```json5
// package.json
{
  "name": "pi-pack-example",
  "type": "module",
  "exports": {
    ".": "./src/extension.ts"
  },
  "keywords": ["pi-package"],
  "pi-pack": {
    // copied to user's ~/.pi/agent/extensions/pi-pack-example/config.ts when they install
    "default-config": "./src/default-config.ts",
    // pi-pack will not prompt user to set up their config.ts if "requires-config-edit": false
    "requires-config-edit": true
  }
}
```

```ts
// ./src/default-config.ts
import { piPackExample } from "pi-pack-example";

export default piPackExample({
  commandName: "pi-pack-example",
  message: "This extension was configured from config.ts.",
});
```

```ts
// ./src/extension.ts
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

export type PiPackExampleOptions = {
  commandName?: string;
  message?: string;
};

export const piPackExample = (options: PiPackExampleOptions = {}) => {
  const commandName = options.commandName ?? "pi-pack-example";
  const message = options.message ?? "Hello from pi-pack-example.";

  return (pi: ExtensionAPI): void => {
    pi.registerCommand(commandName, {
      description: "Show the pi-pack example message",
      handler: async (_args, ctx) => {
        ctx.ui.notify(message, "info");
      },
    });
  };
};
```

#### Mono repo extensions

One repo which includes multiple extensions

```txt
mono-repo/
├── package.json
└── extensions/
    ├── extension-1/
    │   ├── package.json
    │   └── src/
    │       ├── extension.ts
    │       └── default-config.ts
    └── extension-2/
        ├── package.json
        └── src/
            ├── extension.ts
            └── default-config.ts
```

```json5
// package.json
{
  "pi-pack": {
    // dir where extensions are kept
    "extensions-dir": "extensions"
  }
}
```

#### Adding skills, prompts, and themes

Bundle pi resources next to your extension package and return their paths from `resources_discover`. See [example](https://github.com/richardgill/pi-pack-example).

```txt
repo/
├── skills/
│   └── pi-pack-example/
│       └── SKILL.md
├── prompts/
│   └── explain-pi-pack-example.md
└── themes/
    └── pi-pack-example.json
```

```ts
// ./src/extension.ts
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const baseDir = dirname(fileURLToPath(import.meta.url));
const packageRoot = join(baseDir, "..");

pi.on("resources_discover", () => ({
  skillPaths: [join(packageRoot, "skills", "pi-pack-example", "SKILL.md")],
  promptPaths: [join(packageRoot, "prompts", "explain-pi-pack-example.md")],
  themePaths: [join(packageRoot, "themes", "pi-pack-example.json")],
}));
```

## Motivation and inspiration

pi-pack is inspired by neovim's packaging ecosystem where plugins are configured [directly in lua code](https://github.com/folke/snacks.nvim/blob/main/docs/scope.md) with full typing. 

pi's extensions are powerful, but the built-in extension installation mechanism means every extension must have it's own config file and validation is handled manually. pi-pack uses the power of TypeScript to make configuring extensions easy.

## License

MIT
