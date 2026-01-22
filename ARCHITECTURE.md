# Architecture

This is a modern CLI template designed to be used with AI agents.

## Project

pi-pack is a packaging system for [pi](https://github.com/badlogic/pi-mono) extensions inspired by nvim packages.

## Tech stack

- Bun
- Stricli
- Clack
- AI agent optimized
  - `bun run local-ci` runs:
    - Biome formatting and linting
    - tsc
    - Knip (dead code analysis)
    - tests
- Extensive end-to-end testing using `runCli('pi-pack install …')` in tests
  - Tests run fast in-process
- Changesets with automated release PRs

## Binaries / Runtime

Distributed as:
- Bun binaries: e.g. `pi-pack-linux-x64`.
  - Install: `curl -fsSL https://raw.githubusercontent.com/richardgill/pi-pack/main/install | bash`
- npm package which immediately executes bun binary
  - `npx pi-pack`

## One time setup

### GitHub Repository Settings

**Configure merge settings** (squash-only merges + auto-delete branches):

```sh
gh repo edit --enable-squash-merge --delete-branch-on-merge
```

Then disable merge commit and rebase merge via GitHub UI:
```sh
open "$(gh repo view --json url -q .url)/settings#merge-button-settings"
```

Or manually: Settings → General → Pull Requests → Enable "Squash merging" only + "Automatically delete head branches"

**Enable GitHub Actions to create PRs** (required for release workflow):

```sh
gh api repos/OWNER/REPO/actions/permissions/workflow -X PUT \
  -f default_workflow_permissions=read \
  -f can_approve_pull_request_reviews=true
```

Open settings page:
```sh
open "$(gh repo view --json url -q .url)/settings/actions"
```

Then in the GitHub UI: Settings → Actions → General → set "Read repository contents permission" and enable "Allow GitHub Actions to create and approve pull requests".

### GitHub Action Secrets

The release workflow requires these GitHub repository secrets:
- `GITHUB_TOKEN`: Automatically provided by GitHub Actions
- `NPM_TOKEN`: Required for publishing to npm. To set this up:
  1. Go to https://www.npmjs.com/settings/YOUR_USERNAME/tokens
  2. Click "Generate New Token" 
  3. Permission type read and write for 1 package only (you need to publish first)
  4. Copy the token
  5. Set the secret: `gh secret set NPM_TOKEN` (paste token when prompted)

## Release Process

pi-pack uses [Changesets](https://github.com/changesets/changesets) for versioning and publishing. The release process is largely automated via GitHub Actions.

### Adding a Changeset

When you make a change that should be released, add a changeset:

```sh
bun run changeset
```

This will prompt you to:
1. Select the type of change (patch, minor, major)
2. Write a summary of the change

A markdown file will be created in the `.changeset/` directory. Commit this file along with your changes.

**When to add a changeset:**
- Bug fixes → `patch`
- New features (backwards compatible) → `minor`
- Breaking changes → `major`

### Automated Release Flow

When changes with changesets are merged to `main`:

1. **Release PR Created**: The [Changesets GitHub Action](https://github.com/changesets/action) automatically creates/updates a "chore: release" PR that:
   - Consumes all pending changesets
   - Bumps the version in `package.json`
   - Updates `CHANGELOG.md`

2. **Merge the Release PR**: When you're ready to release, merge the release PR. This triggers:

3. **Binary Builds**: Native binaries are built for all platforms:
   - `pi-pack-linux-x64`
   - `pi-pack-linux-arm64`
   - `pi-pack-darwin-x64`
   - `pi-pack-darwin-arm64`
   - `pi-pack-windows-x64`

4. **GitHub Release**: A GitHub release is created with:
   - Platform-specific archives (`.tar.gz` for Linux, `.zip` for macOS/Windows)
   - SHA256 checksums
   - Installation instructions
