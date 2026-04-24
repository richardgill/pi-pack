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


```sh
npm install -g pi-pack
pi-pack
```

Or use directly without installing:

```sh
npx pi-pack@latest
```

### Installing pi-pack compatible extensions

```bash
pi-pack install "npm:@foo/bar@1.0.0"

pi-pack install "git:github.com/user/repo@v1"

pi-pack install "git:github.com/user/mono-repo@v1" --path "folder/in/repo" 

pi-pack update "extension-name"

(cd ~/.pi/extensions/extension-name && pi-pack update)
```

### How pi-pack extensions work

```bash
pi-pack install "git:github.com/richardgill/pi-pack-example"
```

Installs the extension to: 
```
~/.pi/agent/extensions/pi-pack-example/
├── index.ts
└── package.json
```

```ts
// index.ts

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
  }
}
```

Extensions are installed via `pnpm`. 

### Building an extension

pi-pack extensions are simple npm packages:

- They export a function users will call to configure the extension 
- They provide a default config that will be copied into: `~/.pi/agent/extension/<extension-name>/index.ts` 

#### Single repo extension example

#### Mono repo extension example

#### Default config

By default pi-pack will look for the default config in `./src/default-config.ts`. 

You also can override this location in your package's `package.json`:

```json
"pi-pack": { "default-config": "./another/path/something.ts" },
```


## License

MIT
