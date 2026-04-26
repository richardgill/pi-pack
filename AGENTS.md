# pi-pack CLI Project

## Project Overview

This is a CLI tool for managing Git patch workflows. It helps maintain curated patches against upstream repositories.

## Development Commands

- `npm run dev` - Run CLI in development with Node
- Use dashes (not colons) for package.json script names: `test-node` not `test:node`

## Key Dependencies

- `@stricli/core` - CLI framework
- `@clack/prompts` - Interactive prompts
- `vite-plus` - build, lint, format, and test toolchain

## Checking all changes

Always run `npm run local-ci` it runs formatter, linter, tests, build, and knip

## Testing

This codebase has three types of tests:
- **Unit tests** (`*.unit.test.ts`) - Pure function testing, no I/O, fast
- **Integration tests** (`*.integration.test.ts`) - Internal modules with I/O, no CLI
- **E2E tests** (`*.e2e.test.ts`) - Full CLI execution via `runCli()`

Prefer table-driven tests when the same behavior is tested across multiple inputs, edge cases, or error cases.

Use explicit case objects and create one `test(...)` per case:

```ts
const cases = [
  {
    name: "accepts a valid patch id",
    input: "feature-1",
    expected: { ok: true },
  },
  {
    name: "rejects an empty patch id",
    input: "",
    expected: { ok: false, error: "Patch id is required" },
  },
];

cases.forEach(({ name, input, expected }) => {
  test(name, () => {
    expect(parsePatchId(input)).toEqual(expected);
  });
});
```

Prefer case objects with `name`, `input`, and `expected` over positional tuples. If setup or assertions diverge significantly, split into separate tests.

E2E tests are organized 1:1 with commands - each command has its own e2e test file in the command's directory (e.g., `src/commands/init/impl.e2e.test.ts`).

**Always write tests for new functions.** Find the appropriate type of test and test file (or create one) and add coverage. If in doubt - E2E is the preferred type of test.

## Releasing

Use add changeset skill

## Dependencies

- All dependencies use pinned versions with `=` syntax (e.g., `=1.2.3`)
