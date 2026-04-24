# Contributing to pi-pack
See [ARCHITECTURE.md](./ARCHITECTURE.md)

## Development Setup

1. Clone the repository:
   ```sh
   git clone https://github.com/richardgill/pi-pack.git
   cd pi-pack
   ```

2. Install dependencies:
   ```sh
   npm install
   ```

3. Run the CLI in development mode:
   ```sh
   npm run dev
   ```

   **Tip:** You can run the dev CLI from any directory using `--cwd`:
   ```sh
   npm --prefix /path/to/pi-pack run dev -- install "npm:@foo/bar@1.0.0"
   ```

   **Tip:** Add a shell alias for quick access (run this from the pi-pack directory):
   ```sh
   alias pi-packdev="PI_PACK_CWD=\"\$PWD\" npm --prefix $(pwd) run dev --"
   ```
   This bakes in the pi-pack path at definition time, while `$PWD` expands to your working directory at execution time.

   Or generate the alias with your current path (run from the pi-pack directory):
   ```sh
   echo 'alias pi-packdev='"'"'PI_PACK_CWD="$PWD" npm --prefix '"$(pwd)"' run dev --'"'"''
   ```

## Development Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Run the CLI in development mode |
| `npm run build` | Build the Node package with Vite+ |
| `npm run test` | Run the test suite |
| `npm run test-watch` | Run tests in watch mode |
| `npm run check` | Run Vite+ formatting, linting, and type checks |
| `npm run check-fix` | Fix formatting and linting issues |
| `npm run typecheck` | Run TypeScript type checking |
| `npm run local-ci` | Run all CI checks locally |
