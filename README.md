<p align="center">
</p>
<br/>
<p align="center">
  <a href="https://www.npmjs.com/package/pi-pack"><img src="https://img.shields.io/npm/v/pi-pack.svg?label=version" alt="npm package"></a>
  <a href="https://github.com/richardgill/pi-pack/blob/main/LICENSE"><img src="https://img.shields.io/npm/l/pi-pack.svg" alt="license"></a>
  <a href="https://github.com/richardgill/pi-pack/actions/workflows/ci.yml"><img src="https://github.com/richardgill/pi-pack/actions/workflows/ci.yml/badge.svg?branch=main" alt="build status"></a>
</p>
<br/>

# pi-pack 

A packaging system for [pi](https://github.com/badlogic/pi-mono) extensions inspired by nvim packages.

pi-pack extensions are configured using typescript to set options.

## Getting started 

### Install
```sh
npm install -g pi-pack
pi-pack
```

Or use directly without installing:

```sh
npm exec pi-pack
```

### Installing extensions

```
pi-pack install git:github.com/richardgill/pi-presets
```
Installs into: `~/.pi/agent/extensions/presets`

Edit the default config to configure the extension:

```ts
// ~/.pi/agent/extensions/presets/config.ts

import { presets } from 'presets'

export default presets({
  // configure the extension here
  // todo: fix me
  option: 'default-option'
})

```


### Installing pi-pack extensions

```bash
# From npm
pi-pack install "npm:foo-bar"
pi-pack install "npm:foo-bar@1.0.0" # pin version
pi-pack install "npm:foo-bar" --as "baz" # install into ~/.pi/agent/extensions/baz

# From github repo
pi-pack install "git:github.com/user/repo"
pi-pack install "git:github.com/user/repo@v1" # pin git ref: tag, branch, or commit
pi-pack install "git:github.com/user/mono-repo" --extension "extension-name" # from a github monorepo

# From local file system
pi-pack install "~/code/my-extension"
pi-pack install "~/code/my-extension-mono-repo" --extension "files"
```

pi-pack uses [pnpm](https://pnpm.io) under the hood, and supports most of pnpm's [package sources](https://pnpm.io/package-sources).
### Upgrading extensions

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

### Uninstalling extensions

```bash
pi-pack uninstall              # uninstall pi-pack extensions interactively
pi-pack uninstall files tasks  # remove named extensions after confirmation
pi-pack uninstall files --yes  # skip confirmation
```

Uninstall permanently deletes the extension folders, including `config.ts`.
Only pi-pack managed extensions are shown or removed.

### What `pi-pack install` does

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

import { piPackExample } from 'pi-pack-example'

export default piPackExample({
  option: 'default-option'
})
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

### Building an extension

pi-pack extensions repos are simple npm packages:

- They export a function users will call to configure the extension 
- They provide a default config that will be copied into: `~/.pi/agent/extensions/<extension-name>/config.ts` 

#### Create an extension

Run `pi-pack create` to create an extension.

`pi-pack create <name>` creates a single extension package folder.

#### Single repo extensions

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
  "name": "files",
  "type": "module",
  "exports": {
    ".": "./src/extension.ts"
  },
  "keywords": ["pi-package"],
  "pi-pack": {
    // copied to user's ~/.pi/agent/extensions/files/config.ts when they install
    "default-config": "./src/default-config.ts",
    // set false if users normally do not need to edit config.ts after install
    "requires-config-edit": true
  }
}
```

`requires-config-edit` controls the install summary. It defaults to `true`.

When `true`, `pi-pack install` prints:

```txt
Edit config: ~/.pi/agent/extensions/files/config.ts
```

Set it to `false` for extensions that work out of the box and do not need user edits to `config.ts`:

```json5
"pi-pack": {
  "default-config": "./src/default-config.ts",
  "requires-config-edit": false
}
```

```ts
// ./src/default-config.ts
import { extension } from "files";

export default extension({
  commandName: "files",
});
```

```ts
// files/src/extension.ts
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

export type FilesOptions = {
  commandName?: string;
};

export const extension = (options: FilesOptions = {}) => {
  const commandName = options.commandName ?? "files";

  return (pi: ExtensionAPI): void => {
    pi.registerCommand(commandName, {
      description: "Open files mentioned in the conversation",
      handler: async (_args, ctx) => {
        ctx.ui.notify("Open the file browser", "info");
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
    ├── files/
    │   ├── package.json
    │   └── src/
    │       ├── extension.ts
    │       └── default-config.ts
    └── tasks/
```

```json5
// package.json
{
  "pi-pack": {
    // folder where extensions are kept
    "extensions-folder": "extensions"
  }
}
```

```json5
// extensions/files/package.json
{
  "name": "files",
  "type": "module",
  "exports": {
    ".": "./src/extension.ts"
  },
  "keywords": ["pi-package"],
  "pi-pack": {
    // copied to user's ~/.pi/agent/extensions/files/config.ts when they install
    "default-config": "./src/default-config.ts",
    // set false if users normally do not need to edit config.ts after install
    "requires-config-edit": true
  }
}
```

```ts
// ./src/default-config.ts
import { extension } from "files";

export default extension({
  commandName: "files",
});
```

```ts
// files/src/extension.ts
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

export type FilesOptions = {
  commandName?: string;
};

export const extension = (options: FilesOptions = {}) => {
  const commandName = options.commandName ?? "files";

  return (pi: ExtensionAPI): void => {
    pi.registerCommand(commandName, {
      description: "Open files mentioned in the conversation",
      handler: async (_args, ctx) => {
        ctx.ui.notify("Open the file browser", "info");
      },
    });
  };
};
```

## License

MIT
