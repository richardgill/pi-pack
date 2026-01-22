<p align="center">
</p>
<br/>
<p align="center">
  <a href="https://www.npmjs.com/package/pi-pack-cli"><img src="https://img.shields.io/npm/v/pi-pack-cli.svg?label=version" alt="npm package"></a>
  <a href="https://github.com/richardgill/pi-pack/blob/main/LICENSE"><img src="https://img.shields.io/npm/l/pi-pack-cli.svg" alt="license"></a>
  <a href="https://github.com/richardgill/pi-pack/actions/workflows/ci.yml"><img src="https://github.com/richardgill/pi-pack/actions/workflows/ci.yml/badge.svg?branch=main" alt="build status"></a>
</p>
<br/>

# pi-pack 

A packaging system for [pi](https://github.com/badlogic/pi-mono) extensions inspired by nvim packages.

## Getting started 

### Installation

```sh
curl -fsSL https://raw.githubusercontent.com/richardgill/pi-pack/main/install | bash
# follow instructions
pi-pack
```

Or via npm:


```sh
npm install -g pi-pack-cli
pi-pack
```

Or use directly without installing:

```sh
npx pi-pack-cli@latest
```

### Commands

```bash
pi-pack install "npm:@foo/bar@1.0.0"

pi-pack install "git:github.com/user/repo@v1"

pi-pack install "git:github.com/user/mono-repo@v1" --path "folder/in/repo" 

pi-pack update "extension-name"

(cd ~/.pi/extensions/extension-name && pi-pack update)
```

### Building an extension

pi-pack extensions are simple npm packages with a default config which will be placed `~/.pi/extensions/<yourext>/index.ts`

#### Default config

By default pi-pack will look for the default config in `./src/default-config.ts`. 

You can override this location in your package's `package.json`:

```json
"pi-pack": { "default-config": "./another/path/something.ts" },
```

Single repo extension example

Mono repo extension example




## License

MIT
