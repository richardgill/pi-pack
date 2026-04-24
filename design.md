# pi-pack — CLI design

A packaging workflow for **pi extensions** inspired by how Neovim plugins are installed: each installed extension lives in its own folder, has its own `package.json`, and exposes a user-editable `index.ts` that pi loads.

This document describes **what each CLI endpoint does** (user-visible behavior). It intentionally avoids implementation details.

## Goals

- Install pi extensions from **npm** _or_ directly from **git/GitHub** (no npm publish required).
- Support **monorepos** (install a package from a subdirectory).
- Keep each extension **self-contained** (per-extension dependency tree + lockfile).
- Generate a **user-owned** entry file (`index.ts`) where users can pass configuration.
- Make updates safe (avoid clobbering user edits).

## Non-goals

- Not a general-purpose JavaScript package manager.
- Not a registry or discovery service.
- Not responsible for validating extension runtime behavior beyond basic sanity checks.

## Terms

- **Extension package**: the npm package you want to use (from npm or git). Example: `files`.
- **Installed extension**: the folder that pi loads, containing `index.ts` and the local `package.json` that depends on the extension package.
- **Extensions root**: directory that contains all installed extensions.
- **Default config (scaffold)**: a TypeScript module supplied by the extension package that becomes the initial contents of the user’s `index.ts`.

## Requirements & defaults

- The extensions root is resolved using pi’s own extensions-directory resolution (via the pi coding agent).
  - There is no CLI override; `pi-pack` always installs where pi will load extensions.
- Dependencies are installed with npm; no extra package manager is required.
  - This enables installs from git and installs from monorepo subpaths.

## Directory layout (installed extension)

Each installed extension is a directory under the extensions root:

- `<extensionsRoot>/<extensionName>/index.ts` — user-editable config/entrypoint (pi loads this)
- `<extensionsRoot>/<extensionName>/package.json` — local package manifest that depends on the extension package
- `<extensionsRoot>/<extensionName>/package-lock.json` — lockfile for reproducible installs
- `<extensionsRoot>/<extensionName>/node_modules/` — installed dependencies

The CLI must always print the resolved `<extensionsRoot>` it is operating on.

## Source specifiers

`pi-pack install` accepts a single **source specifier** describing where the extension package comes from.

### npm

Format:

- `npm:<packageName>`
- `npm:<packageName>@<versionOrRange>`

Examples:

- `npm:@foo/bar@1.0.0`

Rules:

- If version is omitted, it resolves to `latest`.

### git (GitHub and other hosts)

Format:

- `git:<host>/<owner>/<repo>@<ref>`

Examples:

- `git:github.com/user/repo@v1`

Rules:

- `<ref>` may be a tag, branch, or commit SHA.
- If `<ref>` is omitted, it defaults to the repo’s default branch.

### Monorepo sub-path

If the extension package lives inside a subfolder, the installer must accept:

- `--path <folder/in/repo>`

Example:

- `pi-pack install "git:github.com/user/mono-repo@v1" --path "extensions/files"`

`--path` must point at a folder that contains a valid package.

## Extension package contract (for extension authors)

To be installable with good UX, an extension package should:

- Be a valid installable package (from npm or git).
- Provide a **default config** file intended to be copied into the user’s `index.ts`.
  - Default location: `./src/default-config.ts`
  - Overrideable via `package.json`:

    ```json
    {
      "pi-pack": {
        "default-config": "./another/path/something.ts"
      }
    }
    ```

The default config should be immediately usable as a pi extension entrypoint, typically:

- importing from the extension package, and
- exporting a default value that pi can load.

pi-pack will fail if it canno resolve the default config

## CLI endpoints

### `pi-pack` (no args)

Purpose:

- Provide a friendly entry point that helps users discover the tool.

Behavior:

- Prints a short description + usage.
- Shows the resolved **extensions root**.
- Shows the most common next commands:
  - `pi-pack install …`
  - `pi-pack update …`

Exit status:

- `0` on success.

---

### `pi-pack install <source>`

Purpose:

- Install an extension package and scaffold a user entrypoint for pi.

Inputs:

- `<source>`: one source specifier (npm or git)
- `--path <subdir>` (optional): monorepo install
- `--name <extensionName>` (optional): explicitly choose the install directory name
- `--force` (optional): allow installing into an existing directory (see “Overwrite rules”)

Primary behaviors:

1. **Resolve target name & location**
   - Determine `extensionName` (from `--name`, otherwise from package/repo name).
   - Resolve `<extensionsRoot>` using pi’s extensions-directory resolution.
   - Target dir becomes `<extensionsRoot>/<extensionName>`.

2. **Create or validate target dir**
   - If the directory does not exist: create it.
   - If the directory exists:
     - Without `--force`: error with a message that suggests `pi-pack update <extensionName>`.
     - With `--force`: proceed, but still follow overwrite rules.

3. **Install dependency**
   - Ensure the target dir ends up with a local dependency on the extension package described by `<source>` (and `--path` if given).
   - Ensure dependencies are installed so that `index.ts` can import the extension package.
   - Dependency installation uses npm.

4. **Scaffold `index.ts`**
   - Locate the extension package’s **default config** file (see contract above).
   - If found:
     - Create `index.ts` from that default config.
   - If not found:
     - Fail with a clear message explaining how extension authors can provide `pi-pack.default-config` and what the default location is.

5. **Print a success summary**
   - Path installed to
   - How to edit `index.ts`
   - How to update (`pi-pack update <extensionName>`)

Overwrite rules:

- `index.ts` is considered user-owned.
- `pi-pack install` must not overwrite an existing `index.ts` unless the user explicitly confirms intent (via `--force` + an explicit overwrite prompt/flag).
- If overwrite is not allowed, the command should write the new scaffold as `index.ts.new` (or equivalent) and explain how to merge.

Exit status:

- `0` on success.
- Non-zero on invalid source, missing package, missing default config, or install failures.

---

### `pi-pack update [<extensionName>]`

Purpose:

- Update an already-installed extension.

Inputs:

- `<extensionName>` (optional): which extension to update.
  - If omitted, and the current directory is an installed extension dir, update that extension.
  - Otherwise, error and print usage.
- `--all` (optional): update all installed extensions under the extensions root

Primary behaviors:

1. **Locate installed extension(s)**
   - Resolve the extension directory/directories to update.

2. **Update installed dependency**
   - Update the extension package dependency according to the version/range/ref already recorded in the installed extension’s manifest.
   - Dependency updates use npm.

3. **Protect user config**
   - Never overwrite `index.ts` during update.
   - If the extension’s default config has changed and the user requests a refresh (via an explicit flag), write the refreshed scaffold without destroying existing user edits (e.g. as a separate file) and explain next steps.

4. **Print a result summary**
   - Whether an update occurred
   - Old vs new resolved version/ref (when available)
   - Any manual follow-ups (restart pi, merge scaffold changes, etc.)

Exit status:

- `0` if all requested updates succeed.
- Non-zero if any extension fails to update (must still report which ones succeeded/failed when `--all` is used).
